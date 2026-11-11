// MCP over Streamable HTTP, stateless: one server + transport per request.
// Workers have no long-lived process, and every tool call is independent, so
// there is nothing to keep between requests.
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createCalendarServer } from '../src/server';
import { RestStore, type ServiceAccount } from '../src/rest-store';
import type { Env } from './index';

export async function handleMcp(request: Request, env: Env): Promise<Response> {
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
