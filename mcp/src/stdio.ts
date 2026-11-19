/**
 * stdio transport — for Claude Desktop, Claude Code and Antigravity.
 *
 * Nothing is printed to stdout except the MCP protocol; diagnostics go to
 * stderr. The client spawns this process and speaks JSON-RPC over its stdio.
 */
import process from 'node:process';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createCalendarServer } from './server';
import { createStore, logToStderr } from './store';
import { TOOLS } from './tools';

const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || 'cisa-cal';
const actor = process.env.MCP_ACTOR?.trim() || 'claude-stdio';

const store = createStore(projectId);
const server = createCalendarServer(store, actor);

const transport = new StdioServerTransport();
await server.connect(transport);

const shutdown = () => {
  void server.close().finally(() => process.exit(0));
};

process.stdin.on('end', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

logToStderr(
  `[shared-calendar-mcp] ready on stdio (project ${projectId}, actor ${actor}; tools: ${TOOLS.map((t) => t.name).join(', ')})`,
);
