// Consent screen = the team-password gate.
//
// GET  /authorize renders the form bound to this browser by the provider's
//      consent handle (cookie + one-time handle, no CSRF token of our own).
// POST /authorize verifies the password against Firebase Auth, then issues the
//      authorization code for the shared member account.
import type { AuthRequest, ConsentTransaction } from '@cloudflare/workers-oauth-provider';
import type { Env } from './index';

export async function handleConsent(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const helpers = env.OAUTH_PROVIDER;

  if (request.method === 'GET') {
    const authRequest = await helpers.parseAuthRequest(request);
    const consent = await helpers.beginConsent(authRequest);
    return form(authRequest, consent, null);
  }
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, POST' } });
  }

  const body = await request.formData();
  const password = String(body.get('password') ?? '');
  const handle = String(body.get('handle') ?? '');
  const authRequest = await helpers.parseAuthRequest(request);

  if (!(await verifyTeamPassword(env, password))) {
    // Consume nothing: the old handle stays bound to this browser, but we mint a
    // fresh one so a stolen page cannot be replayed.
    const consent = await helpers.beginConsent(authRequest);
    return form(authRequest, consent, 'That password was not accepted.', 401);
  }

  const approved = await helpers.approveConsent(request, handle, { scope: authRequest.scope });
  const { redirectTo } = await helpers.completeAuthorization({
    request: approved.request,
    userId: env.MEMBER_EMAIL,
    metadata: { email: env.MEMBER_EMAIL, source: 'team-password' },
    scope: approved.request.scope,
    props: { email: env.MEMBER_EMAIL },
  });

  const headers = new Headers(approved.headers);
  headers.set('location', redirectTo);
  return new Response(null, { status: 302, headers });
}

async function verifyTeamPassword(env: Env, password: string): Promise<boolean> {
  if (!password) return false;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: env.MEMBER_EMAIL, password, returnSecureToken: false }),
    },
  );
  return res.ok;
}

function form(authRequest: AuthRequest, consent: ConsentTransaction, error: string | null, status = 200): Response {
  const client = hostnameOf(authRequest.redirectUri);
  const headers = new Headers(consent.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  return new Response(page(client, consent.handle, error), { status, headers });
}

function hostnameOf(uri: string): string {
  try {
    return new URL(uri).hostname;
  } catch {
    return 'the requesting app';
  }
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function page(client: string, handle: string, error: string | null): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connect Claude to the team calendar</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#0f1115; color:#e8eaf0;
         font:15px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { width:min(24rem, calc(100vw - 3rem)); padding:2.25rem; background:#151821;
         border:1px solid #242938; border-radius:14px; }
  h1 { font-size:1.1rem; letter-spacing:-0.01em; margin:0 0 .35rem; }
  p { color:#9aa2b1; margin:0 0 1.25rem; font-size:.9rem; }
  label { display:block; font-size:.72rem; letter-spacing:.1em; text-transform:uppercase; color:#7d8595; margin-bottom:.4rem; }
  input[type=password] { width:100%; box-sizing:border-box; padding:.65rem .75rem; border-radius:8px;
         border:1px solid #2c3242; background:#0f1115; color:#e8eaf0; font:inherit; }
  input[type=password]:focus { outline:2px solid #5b8cff; outline-offset:1px; border-color:transparent; }
  .err { color:#ff9a9a; font-size:.85rem; margin:.75rem 0 0; }
  button { margin-top:1.25rem; width:100%; padding:.7rem 1rem; border:0; border-radius:8px;
         background:#5b8cff; color:#0b0d12; font:600 .9rem/1 inherit; cursor:pointer; }
  button:hover { background:#7aa2ff; }
  .fine { color:#69707f; font-size:.75rem; margin:1rem 0 0; }
</style>
</head>
<body>
<main>
  <h1>Connect Claude to the team calendar</h1>
  <p><strong>${esc(client)}</strong> is asking to read and change the shared calendar as the team member account.</p>
  <form method="post">
    <input type="hidden" name="handle" value="${esc(handle)}">
    <label for="password">Team password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
    ${error ? `<p class="err">${esc(error)}</p>` : ''}
    <button type="submit">Connect</button>
  </form>
  <p class="fine">Claude can create, edit and delete events. Every change is logged.</p>
</main>
</body>
</html>`;
}
