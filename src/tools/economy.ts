import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { SteamMcpError } from '../common/errors.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamEconomyClient } from '../steam/economy-client.js';

const assetClassSchema = z.object({
  classId: z.string().regex(/^\d+$/),
  instanceId: z.string().regex(/^\d+$/).optional(),
});
const uint64Schema = z.string().regex(/^\d+$/);

export function registerEconomyTools(
  server: McpServer,
  economyClient: SteamEconomyClient,
  authManager: SteamOpenIdAuthManager,
): void {
  server.registerTool(
    'steam_get_asset_class_info',
    {
      title: 'Get Steam asset class info',
      description: 'Fetch Steam Economy asset class metadata for one app using a Web API key.',
      inputSchema: {
        appid: z.number().int().positive(),
        language: z.string().min(2).optional(),
        assetClasses: z.array(assetClassSchema).min(1).max(100),
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
          data: await economyClient.getAssetClassInfo(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_asset_prices',
    {
      title: 'Get Steam asset prices',
      description: 'Fetch Steam Economy purchaseable asset prices for one app using a Web API key.',
      inputSchema: {
        appid: z.number().int().positive(),
        currency: z.string().min(3).max(3).optional(),
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
          data: await economyClient.getAssetPrices(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_economy_can_trade',
    {
      title: 'Check Steam Economy trade eligibility',
      description:
        'Check whether one Steam user can initiate an Economy trade with another user using a publisher key. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        appid: z.number().int().positive(),
        steamId: uint64Schema.optional(),
        targetId: uint64Schema,
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
          data: await economyClient.canTrade({
            appid: args.appid,
            steamId: resolveSteamId(args.steamId, authManager),
            targetId: args.targetId,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_exported_assets_for_user',
    {
      title: 'Get Steam exported assets for user',
      description:
        'Get exported Economy assets for one Steam user/app/context using a publisher key. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        appid: z.number().int().positive(),
        contextId: uint64Schema,
        steamId: uint64Schema.optional(),
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
          data: await economyClient.getExportedAssetsForUser({
            appid: args.appid,
            contextId: args.contextId,
            steamId: resolveSteamId(args.steamId, authManager),
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_market_prices',
    {
      title: 'Get Steam Economy market prices',
      description: 'Get Steam Economy market prices for one app using a publisher key.',
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
          data: await economyClient.getMarketPrices({
            appid: args.appid,
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
