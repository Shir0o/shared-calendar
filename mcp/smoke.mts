// Throwaway smoke test: spawn the stdio server, list its tools, call a read-only
// tool that needs no Firebase credentials to describe itself.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['tsx', 'src/stdio.ts'],
  cwd: process.cwd(),
  stderr: 'inherit',
});

const client = new Client({ name: 'smoke', version: '0.0.1' });
await client.connect(transport);

const { tools } = await client.listTools();
console.log(
  tools.map((t) => `${t.name} (${t.annotations?.readOnlyHint ? 'read' : 'write'})`).join('\n'),
);

const categories = await client.callTool({ name: 'list_categories', arguments: {} });
console.log('\nlist_categories →', categories.content[0].text);

await client.close();
