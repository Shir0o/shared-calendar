# Project-Specific Rules

<!-- Repo-specific agent instructions. The rollout script never touches this file. -->


<!-- ── Migrated from CLAUDE.md ── -->

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.
## 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**
Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.
## 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.
## 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.
## 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**
Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```
Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
---
**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
---
## Running the preview server
The app needs Firebase config and is gated behind a login screen. To get a usable preview without asking:
1. **Firebase env:** the preview MCP server does NOT inherit the `env` block from `.claude/settings.local.json`, so create a `.env.local` (gitignored via `*.local`) before starting. Copy `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_APP_ID` from `.claude/settings.local.json`, plus the documented defaults in `.env.example` (`VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_MEMBER_EMAIL`). The Firebase web API key is not a secret. Note: `TEAM_PASSWORD`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.claude/settings.local.json` are NOT vite vars — they are read directly from that file by the agent and should NOT be copied into `.env.local`.
2. **Start:** `preview_start` with config name `dev` (defined in `.claude/launch.json`, runs `vite` on port 5173).
3. **Log in (member):** the calendar UI is behind a team-password gate. Fill the "TEAM PASSWORD" field with `TEAM_PASSWORD` from `.claude/settings.local.json` and click "Enter calendar" to reach the calendar (member role). The user has authorized using this stored shared password for local preview verification.
4. **Log in (admin) — for verifying admin-only features:** the Gate UI doesn't expose an admin password field; the visible admin button uses Google OAuth, which a headless preview browser can't complete. Use `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.claude/settings.local.json` and sign in directly via `preview_eval` after the Gate has loaded:
   ```js
   // Bare specifiers don't resolve in the browser — import via the app's own module.
   // src/lib/firebase.ts re-exports signInWithEmailAndPassword for this purpose.
   const fb = await import('/src/lib/firebase.ts');
   await fb.signInWithEmailAndPassword(fb.auth, '<ADMIN_EMAIL>', '<ADMIN_PASSWORD>');
   ```
   The user has authorized using these stored admin credentials for local preview verification. Prefer the member path (step 3) when admin role isn't needed — admin sign-in mutates app state more broadly (drag-to-reschedule, edit/delete, AccessPanel, category editing).
   If sign-in fails with `auth/user-not-found`, or sign-in succeeds but `role` resolves to `denied`, the one-time owner setup hasn't been done (Firebase Auth user for `<ADMIN_EMAIL>` + a doc at `/admins/<ADMIN_EMAIL>` with `approved: true`). Surface this to the user rather than retrying — only the owner can fix it (via the in-app Access panel signed in as owner, or via the Firestore REST API with a service-account token).
