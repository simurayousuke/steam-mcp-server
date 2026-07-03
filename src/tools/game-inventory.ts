import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { SteamMcpError } from '../common/errors.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamGameInventoryClient } from '../steam/game-inventory-client.js';

const steamIdSchema = z.string().regex(/^\d+$/);
const uint64Schema = z.string().regex(/^\d+$/);

export function registerGameInventoryTools(
  server: McpServer,
  gameInventoryClient: SteamGameInventoryClient,
  authManager: SteamOpenIdAuthManager,
): void {
  server.registerTool(
    'steam_get_game_inventory_history_command_details',
    {
      title: 'Get Steam game inventory history command details',
      description:
        'Get details for one game inventory history command using a publisher key. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        appid: z.number().int().positive(),
        command: z.string().min(1).max(200),
        contextId: uint64Schema,
        commandArguments: z.string().min(1).max(4000),
        steamId: steamIdSchema.optional(),
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
          data: await gameInventoryClient.getHistoryCommandDetails({
            appid: args.appid,
            steamId: resolveSteamId(args.steamId, authManager),
            command: args.command,
            contextId: args.contextId,
            commandArguments: args.commandArguments,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_game_inventory_user_history',
    {
      title: 'Get Steam game inventory user history',
      description:
        'Get inventory history for one Steam user, app, context, and Unix time range using a publisher key. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        appid: z.number().int().positive(),
        contextId: uint64Schema,
        startTime: z.number().int().nonnegative(),
        endTime: z.number().int().nonnegative(),
        steamId: steamIdSchema.optional(),
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
          data: await gameInventoryClient.getUserHistory({
            appid: args.appid,
            steamId: resolveSteamId(args.steamId, authManager),
            contextId: args.contextId,
            startTime: args.startTime,
            endTime: args.endTime,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_game_inventory_asset_history',
    {
      title: 'Get Steam game inventory asset history',
      description: 'Get support asset history for one app asset and context using a publisher key.',
      inputSchema: {
        appid: z.number().int().positive(),
        assetId: uint64Schema,
        contextId: uint64Schema,
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
          data: await gameInventoryClient.supportGetAssetHistory(args),
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
