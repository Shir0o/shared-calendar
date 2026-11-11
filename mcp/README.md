# Shared Calendar MCP server

Exposes the Lattice calendar to Claude over the Model Context Protocol, so you can
ask "what's on next week?" or "move the retro to Thursday" from a chat.

The tool layer is transport-agnostic (`src/tools.ts`) and runs over two transports:
`src/stdio.ts` (Claude Code / Claude Desktop) and `mcp/worker` (claude.ai remote
connector, OAuth).

## Tools

| Tool | Access | Notes |
| --- | --- | --- |
| `list_events` | read | Range query; recurring events expanded into occurrences |
| `search_events` | read | Title / location / notes, whole history |
| `get_event` | read | One doc, including its recurrence rule |
| `list_categories` | read | The seven permitted category ids |
| `find_free_slot` | read | Free 30-min slots on a day, 08:00–18:00 |
| `suggest_dates` | read | Quietest days in the next four weeks |
| `create_event` | write | Timed events need `duration_minutes` or `end` |
| `update_event` | write | Patches only the fields you pass |
| `delete_events` | write | Requires a preview call, then `confirm: true` |

Recurring events are edited at the series level: `update_event` / `delete_events`
change the whole series, not one occurrence. Overlaps are allowed and are not
errors — that is the product's rule, not a gap in the tooling.

## Credentials

The server uses the Firebase Admin SDK, which bypasses `firestore.rules`. That is
required (an MCP client has no signed-in Firebase user) and is why the tool set is
deliberately narrow and every write is audited.

1. Firebase console → Project settings → Service accounts → **Generate new private key**
   for project `cisa-cal`. A `roles/datastore.user` service account is enough.
2. Keep the JSON **outside this repo** (it is a full-access credential to Firestore).
3. Point the server at it:

   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
   # optional: FIREBASE_PROJECT_ID (default cisa-cal), MCP_ACTOR (default claude-stdio)
   ```

Writes append to the `auditLog` collection (`actor`, `action`, `eventIds`,
`summary`, `at`). Firestore rules have no match for it, so it is server-only: not
readable or writable from the app.

The server never touches `config/*`, `admins/*` or `accessRequests/*`.

## Claude Code

The repo ships `.mcp.json`:

```json
{
  "mcpServers": {
    "shared-calendar": {
      "command": "./mcp/node_modules/.bin/tsx",
      "args": ["mcp/src/stdio.ts"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "${GOOGLE_APPLICATION_CREDENTIALS}",
        "FIREBASE_PROJECT_ID": "cisa-cal"
      }
    }
  }
}
```

Run `npm install` inside `mcp/` first, export `GOOGLE_APPLICATION_CREDENTIALS`,
then approve the server when Claude Code prompts.

## Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` needs absolute
paths:

```json
{
  "mcpServers": {
    "shared-calendar": {
      "command": "/absolute/path/to/repo/mcp/node_modules/.bin/tsx",
      "args": ["/absolute/path/to/repo/mcp/src/stdio.ts"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/absolute/path/to/service-account.json",
        "FIREBASE_PROJECT_ID": "cisa-cal",
        "MCP_ACTOR": "claude-desktop"
      }
    }
  }
}
```

## Development

```bash
cd mcp
npm install
npm run typecheck        # stdio + Worker
npx tsx smoke.mts        # lists tools over a real stdio handshake, no credentials needed
npx wrangler dev         # Worker + OAuth locally (dummy .dev.vars is enough)
```

Tests live in `test/tools.test.ts` and `test/rest-store.test.ts` and run from the
repo root with `npm test`. They use an in-memory store, so no Firebase and no
network.

## Remote connector (claude.ai)

`mcp/worker` is a Cloudflare Worker that serves the same tools over Streamable
HTTP, fronted by OAuth 2.1 (dynamic client registration, PKCE S256, refresh
tokens) from `@cloudflare/workers-oauth-provider`. The consent screen is the
team-password gate: the Worker sends the password to Firebase Auth
(`accounts:signInWithPassword`), so no password is stored and a wrong one is
rejected upstream.

The Worker cannot run `firebase-admin`, so it uses `src/rest-store.ts`: the
Firestore REST API, authenticated with a service-account JWT signed through
WebCrypto. Same tools, same validation, same audit trail.

### Deploy

```bash
cd mcp
npx wrangler login
npx wrangler kv namespace create OAUTH_KV   # paste the id into wrangler.toml
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT   # service-account JSON, one line
npx wrangler secret put FIREBASE_WEB_API_KEY
# edit worker/config.ts → PUBLIC_URL to the deployed origin (custom domain preferred)
npx wrangler deploy
```

`PUBLIC_URL` must match the deployed origin exactly: it is the RFC 9728 resource
identifier, and the provider refuses to serve discovery metadata or a
`resource_metadata` challenge when the request origin disagrees.

Then in Claude: Settings → Connectors → Add custom connector, URL
`https://<origin>/mcp`. Claude registers itself, opens the consent page, and you
enter the team password once.

### What the flow looks like

1. Client fetches `/.well-known/oauth-protected-resource/mcp` → issuer.
2. Registers at `/register` (DCR), starts `/authorize` with PKCE.
3. Consent page posts the team password; Firebase verifies it.
4. `/token` exchanges the code for a 1-hour access token + 30-day refresh token.
5. `/mcp` accepts the bearer token; `env.OAUTH_PROVIDER` validates it before the
   handler runs.

Verified locally with `wrangler dev`: discovery, DCR, PKCE consent, token
exchange, and `tools/list` + `tools/call` over HTTP all pass. The one step that
cannot be verified without real credentials is the password check itself.

