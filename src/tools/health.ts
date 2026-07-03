import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { toolFailure, toolSuccess } from '../common/tool-result.js';
import { loadConfig } from '../config/env.js';
import type { ServerMetadata } from '../mcp/server.js';

export function registerHealthTool(server: McpServer, metadata: ServerMetadata): void {
  server.registerTool(
    'steam_health_check',
    {
      title: 'Steam MCP health check',
      description: 'Return local server status and currently implemented capability groups.',
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    () => {
      try {
        const config = loadConfig();
        const status = {
          status: 'ok',
          server: metadata,
          config: {
            hasWebApiKey: Boolean(config.STEAM_WEB_API_KEY),
            hasPublisherKey: Boolean(config.STEAM_PUBLISHER_KEY),
            hasOAuthClient: Boolean(config.STEAM_OAUTH_CLIENT_ID && config.STEAM_OAUTH_CLIENT_SECRET),
            defaultCountry: config.STEAM_DEFAULT_COUNTRY,
            defaultLanguage: config.STEAM_DEFAULT_LANGUAGE,
            requestTimeoutMs: config.STEAM_REQUEST_TIMEOUT_MS,
            cacheTtlSeconds: config.STEAM_CACHE_TTL_SECONDS,
            rateLimitRps: config.STEAM_RATE_LIMIT_RPS,
          },
          capabilities: {
            mcpTransport: ['stdio'],
            implementedToolGroups: [
              'health',
              'steam-authorized-user-overview',
              'steam-openid-auth',
              'steam-user-web-api-key-storage',
              'steam-oauth',
              'steam-web-api',
              'steam-web-api-catalog',
              'steam-api-readonly-caller',
              'steam-app-specific',
              'steam-cloud',
              'steam-community',
              'steam-directory',
              'steam-economy',
              'steam-econ-service',
              'steam-econ-market',
              'steam-game-inventory',
              'steam-game-notifications',
              'steam-game-servers',
              'steam-inventory-service',
              'steam-lobby-matchmaking',
              'steam-microtxn',
              'steam-partner-financials',
              'steam-player',
              'steam-publisher',
              'steam-resources',
              'steam-site-license',
              'steam-store',
              'steam-wishlist',
              'steam-workshop',
            ],
          },
        };

        return toolSuccess({ data: status });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
