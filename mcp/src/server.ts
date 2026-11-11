// Wires the shared tool set onto an MCP server. Transport-agnostic: stdio.ts
// and the remote Worker both call this.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CalendarStore } from './types';
import { TOOLS } from './tools';

export const SERVER_INFO = { name: 'shared-calendar', version: '0.1.0' } as const;

export function createCalendarServer(store: CalendarStore, actor: string): McpServer {
  const server = new McpServer(SERVER_INFO);

  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      },
      async (args) => {
        try {
          const result = await tool.run({ store, actor }, args);
          return {
            content: [{ type: 'text' as const, text: result.text }],
            isError: result.isError,
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: 'text' as const, text: `Error: ${message}` }],
            isError: true,
          };
        }
      },
    );
  }

  return server;
}
