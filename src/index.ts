import { pathToFileURL } from 'node:url';

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { createSteamMcpServer } from './mcp/server.js';

async function main(): Promise<void> {
  const server = createSteamMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('Steam MCP server is running over stdio.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
