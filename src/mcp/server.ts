import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerHealthTool } from '../tools/health.js';

const SERVER_NAME = 'steam-mcp-server';
const SERVER_VERSION = '0.1.0';

export function createSteamMcpServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerHealthTool(server);

  return server;
}

export function getServerMetadata(): { name: string; version: string } {
  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  };
}
