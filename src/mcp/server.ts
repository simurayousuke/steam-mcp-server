import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { registerHealthTool } from '../tools/health.js';

const SERVER_NAME = 'steam-mcp-server';
const SERVER_VERSION = '0.1.0';

export type ServerMetadata = {
  name: string;
  version: string;
};

export function createSteamMcpServer(): McpServer {
  const metadata = getServerMetadata();
  const server = new McpServer(metadata);

  registerHealthTool(server, metadata);

  return server;
}

export function getServerMetadata(): ServerMetadata {
  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  };
}
