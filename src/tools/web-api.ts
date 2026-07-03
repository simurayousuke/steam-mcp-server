import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamWebApiClient } from '../steam/web-api-client.js';

export function registerWebApiTools(server: McpServer, webApiClient: SteamWebApiClient): void {
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
}
