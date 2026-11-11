// stdio transport — for Claude Code and Claude Desktop.
//
// Credentials: the Firebase Admin SDK reads GOOGLE_APPLICATION_CREDENTIALS
// (path to a service-account JSON key) or GOOGLE_APPLICATION_CREDENTIALS_JSON.
// Nothing is printed to stdout except the MCP protocol: use console.error.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createCalendarServer } from './server';
import { FirestoreStore } from './store';

const projectId = process.env.FIREBASE_PROJECT_ID ?? 'cisa-cal';
const actor = process.env.MCP_ACTOR ?? 'claude-stdio';

const server = createCalendarServer(new FirestoreStore(projectId), actor);

server
  .connect(new StdioServerTransport())
  .then(() => console.error(`[shared-calendar] MCP ready (project ${projectId}, actor ${actor})`))
  .catch((err) => {
    console.error('[shared-calendar] failed to start:', err);
    process.exit(1);
  });
