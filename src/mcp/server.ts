import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { SteamWebApiCatalogClient } from '../catalog/steam-web-api-catalog.js';
import { SteamCredentialManager } from '../auth/credentials.js';
import { SteamOpenIdAuthManager } from '../auth/session.js';
import { HttpJsonClient } from '../common/http.js';
import { loadApiAllowlist } from '../config/allowlist.js';
import { loadConfig } from '../config/env.js';
import { SteamCommunityClient } from '../steam/community-client.js';
import { SteamPlayerClient } from '../steam/player-client.js';
import { SteamStoreClient } from '../steam/store-client.js';
import { SteamWebApiReadonlyCaller } from '../steam/web-api-readonly-caller.js';
import { SteamWorkshopClient } from '../steam/workshop-client.js';
import { registerAuthTools } from '../tools/auth.js';
import { registerCatalogTools } from '../tools/catalog.js';
import { registerCommunityTools } from '../tools/community.js';
import { registerHealthTool } from '../tools/health.js';
import { registerPlayerTools } from '../tools/player.js';
import { registerStoreTools } from '../tools/store.js';
import { registerWorkshopTools } from '../tools/workshop.js';

const SERVER_NAME = 'steam-mcp-server';
const SERVER_VERSION = '0.1.0';

export type ServerMetadata = {
  name: string;
  version: string;
};

export function createSteamMcpServer(): McpServer {
  const metadata = getServerMetadata();
  const config = loadConfig();
  const apiAllowlist = loadApiAllowlist(config.STEAM_API_ALLOWLIST_FILE);
  const credentialManager = new SteamCredentialManager(config.STEAM_WEB_API_KEY);
  const server = new McpServer(metadata);
  const http = new HttpJsonClient({
    timeoutMs: config.STEAM_REQUEST_TIMEOUT_MS,
    userAgent: config.userAgent,
  });
  const catalogClient = new SteamWebApiCatalogClient({
    http,
    apiKey: () => credentialManager.getWebApiKey(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const readonlyCaller = new SteamWebApiReadonlyCaller({
    catalogClient,
    http,
    webApiKey: () => credentialManager.getWebApiKey(),
    allowlistedMethods: apiAllowlist,
  });
  const storeClient = new SteamStoreClient({
    http,
    country: config.STEAM_DEFAULT_COUNTRY,
    language: config.STEAM_DEFAULT_LANGUAGE,
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const authManager = new SteamOpenIdAuthManager({
    host: config.STEAM_AUTH_CALLBACK_HOST,
    port: config.STEAM_AUTH_CALLBACK_PORT,
    http,
  });
  const playerClient = new SteamPlayerClient({
    http,
    webApiKey: () => credentialManager.getWebApiKey(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const communityClient = new SteamCommunityClient({
    http,
    language: config.STEAM_DEFAULT_LANGUAGE,
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const workshopClient = new SteamWorkshopClient({
    http,
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });

  registerHealthTool(server, metadata);
  registerAuthTools(server, authManager, credentialManager);
  registerCatalogTools(server, catalogClient, readonlyCaller, apiAllowlist);
  registerCommunityTools(server, communityClient, authManager);
  registerPlayerTools(server, playerClient, authManager);
  registerStoreTools(server, storeClient, authManager);
  registerWorkshopTools(server, workshopClient);

  return server;
}

export function getServerMetadata(): ServerMetadata {
  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  };
}
