// MCP over Streamable HTTP, stateless: one server + transport per request.
// Workers have no long-lived process, and every tool call is independent, so
// there is nothing to keep between requests.
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createCalendarServer } from '../src/server';
import { RestStore, type ServiceAccount } from '../src/rest-store';
import type { Env } from './index';

export async function handleMcp(request: Request, env: Env): Promise<Response> {
  // Stateless servers have no stream to offer on GET. Answering it with an
  // SSE stream that closes at once makes clients reconnect every second,
  // which burned through the Workers daily request limit. 405 tells them
  // not to open one (MCP spec, Streamable HTTP).
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
  }
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccount;
  const store = new RestStore({ ...sa, project_id: sa.project_id || env.FIREBASE_PROJECT_ID });
  const server = createCalendarServer(store, env.MCP_ACTOR ?? 'claude-web');

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);

  try {
    return await transport.handleRequest(request);
  } finally {
    // Nothing survives the response, but closing releases the transport's maps.
    void server.close();
  }
}
