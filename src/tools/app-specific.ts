import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamAppSpecificClient } from '../steam/app-specific-client.js';

export function registerAppSpecificTools(server: McpServer, appSpecificClient: SteamAppSpecificClient): void {
  server.registerTool(
    'steam_get_gc_client_version',
    {
      title: 'Get Steam Game Coordinator client version',
      description: 'Fetch IGCVersion_<appid>/GetClientVersion for public app-specific Game Coordinator version endpoints.',
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
          data: await appSpecificClient.getGcClientVersion(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_gc_server_version',
    {
      title: 'Get Steam Game Coordinator server version',
      description: 'Fetch IGCVersion_<appid>/GetServerVersion for public app-specific Game Coordinator version endpoints.',
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
          data: await appSpecificClient.getGcServerVersion(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_portal2_leaderboard_bucketized_data',
    {
      title: 'Get Portal 2 bucketized leaderboard data',
      description: 'Fetch IPortal2Leaderboards_620/GetBucketizedData for a Portal 2 leaderboard.',
      inputSchema: {
        leaderboardName: z.string().min(1),
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
          data: await appSpecificClient.getPortal2LeaderboardBucketizedData(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_tf2_world_status',
    {
      title: 'Get Team Fortress 2 world status',
      description: 'Fetch ITFSystem_440/GetWorldStatus.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        return toolSuccess({
          data: await appSpecificClient.getTf2WorldStatus(),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
