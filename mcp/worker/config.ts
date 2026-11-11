// Public origin the OAuth metadata advertises.
//
// RFC 9728 requires the protected resource to be an absolute HTTPS URL, and the
// provider reads it at module scope (there is no env at that point). Change this
// to your custom domain before deploying; the default matches the Worker name in
// wrangler.toml.
export const PUBLIC_URL = 'https://shared-calendar-mcp.workers.dev';
