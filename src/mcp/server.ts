import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { SteamWebApiCatalogClient } from '../catalog/steam-web-api-catalog.js';
import { SteamCredentialManager } from '../auth/credentials.js';
import { SteamOpenIdAuthManager } from '../auth/session.js';
import { HttpJsonClient } from '../common/http.js';
import { loadApiAllowlist } from '../config/allowlist.js';
import { loadConfig } from '../config/env.js';
import { registerSteamResources } from '../resources/steam-resources.js';
import { SteamCheatReportingClient } from '../steam/cheat-reporting-client.js';
import { SteamCloudClient } from '../steam/cloud-client.js';
import { SteamCommunityClient } from '../steam/community-client.js';
import { SteamDirectoryClient } from '../steam/directory-client.js';
import { SteamEconMarketClient } from '../steam/econ-market-client.js';
import { SteamEconServiceClient } from '../steam/econ-service-client.js';
import { SteamEconomyClient } from '../steam/economy-client.js';
import { SteamGameInventoryClient } from '../steam/game-inventory-client.js';
import { SteamGameNotificationsClient } from '../steam/game-notifications-client.js';
import { SteamGameServersClient } from '../steam/game-servers-client.js';
import { SteamInventoryClient } from '../steam/inventory-client.js';
import { SteamLobbyMatchmakingClient } from '../steam/lobby-matchmaking-client.js';
import { SteamMicroTxnClient } from '../steam/microtxn-client.js';
import { SteamPartnerFinancialsClient } from '../steam/partner-financials-client.js';
import { SteamPlayerClient } from '../steam/player-client.js';
import { SteamPublisherClient } from '../steam/publisher-client.js';
import { SteamSiteLicenseClient } from '../steam/site-license-client.js';
import { SteamStoreClient } from '../steam/store-client.js';
import { SteamWebApiClient } from '../steam/web-api-client.js';
import { SteamWebApiReadonlyCaller } from '../steam/web-api-readonly-caller.js';
import { SteamWishlistClient } from '../steam/wishlist-client.js';
import { SteamWorkshopClient } from '../steam/workshop-client.js';
import { registerAuthTools } from '../tools/auth.js';
import { registerCatalogTools } from '../tools/catalog.js';
import { registerCheatReportingTools } from '../tools/cheat-reporting.js';
import { registerCloudTools } from '../tools/cloud.js';
import { registerCommunityTools } from '../tools/community.js';
import { registerDirectoryTools } from '../tools/directory.js';
import { registerEconMarketTools } from '../tools/econ-market.js';
import { registerEconServiceTools } from '../tools/econ-service.js';
import { registerEconomyTools } from '../tools/economy.js';
import { registerGameInventoryTools } from '../tools/game-inventory.js';
import { registerGameNotificationsTools } from '../tools/game-notifications.js';
import { registerGameServersTools } from '../tools/game-servers.js';
import { registerHealthTool } from '../tools/health.js';
import { registerInventoryTools } from '../tools/inventory.js';
import { registerLobbyMatchmakingTools } from '../tools/lobby-matchmaking.js';
import { registerMicroTxnTools } from '../tools/microtxn.js';
import { registerPartnerFinancialsTools } from '../tools/partner-financials.js';
import { registerPlayerTools } from '../tools/player.js';
import { registerPublisherTools } from '../tools/publisher.js';
import { registerSiteLicenseTools } from '../tools/site-license.js';
import { registerStoreTools } from '../tools/store.js';
import { registerWebApiTools } from '../tools/web-api.js';
import { registerWishlistTools } from '../tools/wishlist.js';
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
  const credentialManager = new SteamCredentialManager(
    config.STEAM_WEB_API_KEY,
    config.STEAM_PUBLISHER_KEY,
    config.STEAM_OAUTH_CLIENT_ID,
    config.STEAM_FINANCIAL_KEY,
  );
  const server = new McpServer(metadata);
  const http = new HttpJsonClient({
    rateLimitRps: config.STEAM_RATE_LIMIT_RPS,
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
  const cloudClient = new SteamCloudClient({
    http,
    oauthAccessToken: () => credentialManager.getOAuthAccessToken(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const cheatReportingClient = new SteamCheatReportingClient({
    http,
    publisherKey: () => credentialManager.getPublisherKey(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const workshopClient = new SteamWorkshopClient({
    http,
    webApiKey: () => credentialManager.getWebApiKey(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const webApiClient = new SteamWebApiClient({
    http,
    webApiKey: () => credentialManager.getWebApiKey(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const economyClient = new SteamEconomyClient({
    http,
    webApiKey: () => credentialManager.getWebApiKey(),
    publisherKey: () => credentialManager.getPublisherKey(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const econServiceClient = new SteamEconServiceClient({
    http,
    webApiKey: () => credentialManager.getWebApiKey(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const econMarketClient = new SteamEconMarketClient({
    http,
    publisherKey: () => credentialManager.getPublisherKey(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const gameServersClient = new SteamGameServersClient({
    http,
    webApiKey: () => credentialManager.getWebApiKey(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const gameNotificationsClient = new SteamGameNotificationsClient({
    http,
    publisherKey: () => credentialManager.getPublisherKey(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const gameInventoryClient = new SteamGameInventoryClient({
    http,
    publisherKey: () => credentialManager.getPublisherKey(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const lobbyClient = new SteamLobbyMatchmakingClient({
    http,
    publisherKey: () => credentialManager.getPublisherKey(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const siteLicenseClient = new SteamSiteLicenseClient({
    http,
    publisherKey: () => credentialManager.getPublisherKey(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const partnerFinancialsClient = new SteamPartnerFinancialsClient({
    http,
    financialKey: () => credentialManager.getFinancialKey(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const microTxnClient = new SteamMicroTxnClient({
    http,
    publisherKey: () => credentialManager.getPublisherKey(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const publisherClient = new SteamPublisherClient({
    http,
    publisherKey: () => credentialManager.getPublisherKey(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const inventoryClient = new SteamInventoryClient({
    http,
    publisherKey: () => credentialManager.getPublisherKey(),
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const wishlistClient = new SteamWishlistClient({
    http,
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });
  const directoryClient = new SteamDirectoryClient({
    http,
    cacheTtlMs: config.STEAM_CACHE_TTL_SECONDS * 1000,
  });

  registerHealthTool(server, metadata);
  registerAuthTools(server, authManager, credentialManager);
  registerCatalogTools(server, catalogClient, readonlyCaller, apiAllowlist);
  registerCheatReportingTools(server, cheatReportingClient);
  registerCloudTools(server, cloudClient);
  registerCommunityTools(server, communityClient, authManager);
  registerDirectoryTools(server, directoryClient);
  registerEconMarketTools(server, econMarketClient, authManager);
  registerEconServiceTools(server, econServiceClient);
  registerEconomyTools(server, economyClient, authManager);
  registerGameInventoryTools(server, gameInventoryClient, authManager);
  registerGameNotificationsTools(server, gameNotificationsClient, authManager);
  registerGameServersTools(server, gameServersClient);
  registerInventoryTools(server, inventoryClient, authManager);
  registerLobbyMatchmakingTools(server, lobbyClient);
  registerMicroTxnTools(server, microTxnClient, authManager);
  registerPartnerFinancialsTools(server, partnerFinancialsClient);
  registerPlayerTools(server, playerClient, authManager);
  registerPublisherTools(server, publisherClient, authManager);
  registerSiteLicenseTools(server, siteLicenseClient);
  registerStoreTools(server, storeClient, authManager);
  registerWebApiTools(server, webApiClient, authManager);
  registerWishlistTools(server, wishlistClient, authManager);
  registerWorkshopTools(server, workshopClient);
  registerSteamResources(server, {
    playerClient,
    storeClient,
    webApiClient,
  });

  return server;
}

export function getServerMetadata(): ServerMetadata {
  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  };
}
