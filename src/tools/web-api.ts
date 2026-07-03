import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { SteamMcpError } from '../common/errors.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamWebApiClient } from '../steam/web-api-client.js';

export function registerWebApiTools(
  server: McpServer,
  webApiClient: SteamWebApiClient,
  authManager: SteamOpenIdAuthManager,
): void {
  server.registerTool(
    'steam_get_news_for_app',
    {
      title: 'Get Steam news for app',
      description: 'Fetch official Steam Web API news entries for one app.',
      inputSchema: {
        appid: z.number().int().positive(),
        count: z.number().int().positive().max(100).optional(),
        endDate: z.number().int().positive().optional(),
        feeds: z.string().min(1).optional(),
        maxLength: z.number().int().min(0).optional(),
        tags: z.string().min(1).optional(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        return toolSuccess({
          data: await webApiClient.getNewsForApp(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_number_of_current_players',
    {
      title: 'Get current Steam player count',
      description: 'Fetch current player count for one Steam app.',
      inputSchema: {
        appid: z.number().int().positive(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        return toolSuccess({
          data: await webApiClient.getNumberOfCurrentPlayers(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_global_achievement_percentages',
    {
      title: 'Get global achievement percentages',
      description: 'Fetch global achievement completion percentages for one Steam app.',
      inputSchema: {
        appid: z.number().int().positive(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        return toolSuccess({
          data: await webApiClient.getGlobalAchievementPercentages(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_servers_at_address',
    {
      title: 'Get Steam servers at address',
      description: 'Query official Steam Web API server records for an IP or IP:queryport address.',
      inputSchema: {
        address: z.string().min(1),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        return toolSuccess({
          data: await webApiClient.getServersAtAddress(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_global_stats_for_game',
    {
      title: 'Get Steam global stats for game',
      description: 'Fetch global Steam stats for named stats on one app.',
      inputSchema: {
        appid: z.number().int().positive(),
        statNames: z.array(z.string().min(1)).min(1).max(100),
        startDate: z.number().int().positive().optional(),
        endDate: z.number().int().positive().optional(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        return toolSuccess({
          data: await webApiClient.getGlobalStatsForGame(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_schema_for_game',
    {
      title: 'Get Steam stats schema for game',
      description: 'Fetch the official Steam stats and achievement schema for one app.',
      inputSchema: {
        appid: z.number().int().positive(),
        language: z.string().min(2).optional(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        return toolSuccess({
          data: await webApiClient.getSchemaForGame(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_games_followed',
    {
      title: 'Get followed Steam games',
      description: 'Fetch games followed by a Steam user. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        steamId: z.string().min(1).optional(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        return toolSuccess({
          data: await webApiClient.getGamesFollowed({
            steamId: resolveSteamId(args.steamId, authManager),
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_games_followed_count',
    {
      title: 'Get followed Steam game count',
      description: 'Fetch followed game count for a Steam user. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        steamId: z.string().min(1).optional(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        return toolSuccess({
          data: await webApiClient.getGamesFollowedCount({
            steamId: resolveSteamId(args.steamId, authManager),
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}

function resolveSteamId(explicitSteamId: string | undefined, authManager: SteamOpenIdAuthManager): string {
  if (explicitSteamId) {
    return explicitSteamId;
  }

  const [steamId] = authManager.getStatus().authenticatedSteamIds;

  if (!steamId) {
    throw new SteamMcpError({
      code: 'authentication_required',
      message: 'steamId is required when no Steam OpenID session is authenticated.',
    });
  }

  return steamId;
}
