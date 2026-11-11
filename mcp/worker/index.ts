// Cloudflare Worker entry: OAuth 2.1 authorization server + MCP resource server.
//
// The consent screen is the same team-password gate the app uses. The password
// is verified by Firebase Auth itself (Identity Toolkit signInWithPassword), so
// the Worker stores no password and a wrong one is rejected upstream.
import OAuthProvider, { type OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { handleMcp } from './mcp';
import { handleConsent } from './consent';
import { PUBLIC_URL } from './config';

export interface Env {
  OAUTH_KV: KVNamespace;
  OAUTH_PROVIDER: OAuthHelpers;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_WEB_API_KEY: string;
  MEMBER_EMAIL: string;
  /** Service-account JSON, set with `wrangler secret put`. */
  FIREBASE_SERVICE_ACCOUNT: string;
  MCP_ACTOR?: string;
}

const defaultHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/authorize') return handleConsent(request, env, ctx);
    if (pathname === '/') return landing();
    return new Response('Not found', { status: 404 });
  },
};

const apiHandler = {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext, _props?: unknown): Promise<Response> {
    return handleMcp(request, env);
  },
};

export default new OAuthProvider<Env>({
  apiRoute: '/mcp',
  apiHandler,
  defaultHandler,
  authorizeEndpoint: '/authorize',
  tokenEndpoint: '/token',
  clientRegistrationEndpoint: '/register',
  resourceMetadata: { resource: `${PUBLIC_URL}/mcp`, resource_name: 'Lattice team calendar' },
  scopesSupported: ['calendar'],
  accessTokenTTL: 60 * 60,
  refreshTokenTTL: 30 * 24 * 60 * 60,
  // Registered clients can be revoked by deleting their KV entry; the default
  // TTL also stops abandoned registrations accumulating forever.
  clientRegistrationTTL: 90 * 24 * 60 * 60,
});

function landing(): Response {
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lattice calendar · MCP</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#0f1115; color:#e8eaf0;
         font:15px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width:34rem; padding:2.5rem; }
  h1 { font-size:1.35rem; letter-spacing:-0.01em; margin:0 0 .75rem; }
  p { color:#9aa2b1; margin:0 0 .75rem; }
  code { background:#1a1d24; padding:.1rem .35rem; border-radius:4px; font-size:.85em; }
</style>
</head>
<body><main>
  <h1>Lattice calendar · MCP server</h1>
  <p>This endpoint exposes the team calendar to Claude over the Model Context Protocol.</p>
  <p>Connect it from Claude with the URL <code>/mcp</code>. You will be asked for the team password,
     and the same access rules apply as in the app.</p>
</main></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
