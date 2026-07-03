import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { SteamWebApiCatalogClient } from '../catalog/steam-web-api-catalog.js';
import { HttpJsonClient } from '../common/http.js';
import { loadConfig } from '../config/env.js';
import { registerCatalogTools } from '../tools/catalog.js';
import { registerHealthTool } from '../tools/health.js';

const SERVER_NAME = 'steam-mcp-server';
const SERVER_VERSION = '0.1.0';

export type ServerMetadata = {
  name: string;
  version: string;
};

export function createSteamMcpServer(): McpServer {
  const metadata = getServerMetadata();
  const config = loadConfig();
  const server = new McpServer(metadata);
  const http = new HttpJsonClient({
    timeoutMs: config.STEAM_REQUEST_TIMEOUT_MS,
    userAgent: config.userAgent,
  });
  const catalogClient = new SteamWebApiCatalogClient({
    http,
    apiKey: config.STEAM_WEB_API_KEY,
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });

  registerHealthTool(server, metadata);
  registerCatalogTools(server, catalogClient);

  return server;
}

export function getServerMetadata(): ServerMetadata {
  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  };
}
