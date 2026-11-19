// Stdio handshake smoke test: spawn the real stdio entrypoint, list its tools,
// then call two read-only tools against the in-memory store. No Firebase
// credentials and no network. Run with `npm run smoke`.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const directory = fileURLToPath(new URL('.', import.meta.url));
const tsx = fileURLToPath(new URL('./node_modules/.bin/tsx', import.meta.url));

const env = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
);

const transport = new StdioClientTransport({
  command: tsx,
  args: ['src/stdio.ts'],
  cwd: directory,
  env: {
    ...env,
    MCP_BACKEND: 'memory',
    MCP_ACTOR: 'smoke',
    FIREBASE_PROJECT_ID: 'cisa-cal',
  },
  stderr: 'inherit',
});

const client = new Client({ name: 'shared-calendar-smoke', version: '0.0.1' });

try {
  await client.connect(transport);

  const { tools } = await client.listTools();
  console.log(tools.map((tool) => tool.name).join('\n'));

  const expected = [
    'list_events',
    'search_events',
    'get_event',
    'list_categories',
    'find_free_slot',
    'suggest_dates',
    'create_event',
    'update_event',
    'delete_events',
  ];
  const missing = expected.filter((name) => !tools.some((tool) => tool.name === name));
  if (missing.length > 0) throw new Error(`Missing tools: ${missing.join(', ')}`);

  const categories = await client.callTool({ name: 'list_categories', arguments: {} });
  const categoriesText = (categories.content as { type: string; text?: string }[])[0]?.text ?? '';
  console.log(`\nlist_categories → ${categoriesText.replace(/\s+/g, ' ')}`);
  if (!categoriesText.includes('"product"')) throw new Error('list_categories returned no JSON payload');

  const events = await client.callTool({
    name: 'list_events',
    arguments: { start: '2026-01-01', end: '2026-01-07' },
  });
  const eventsText = (events.content as { type: string; text?: string }[])[0]?.text ?? '';
  console.log(`list_events → ${eventsText.replace(/\s+/g, ' ')}`);
  if (events.isError) throw new Error(`list_events failed: ${eventsText}`);

  console.log(`\n[shared-calendar-mcp] smoke passed: ${tools.length} tools over stdio`);
} finally {
  await client.close();
}
