import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { SteamMcpError } from '../common/errors.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamEconMarketClient } from '../steam/econ-market-client.js';

const steamIdSchema = z.string().regex(/^\d+$/);
const uint64Schema = z.string().regex(/^\d+$/);

export function registerEconMarketTools(
  server: McpServer,
  econMarketClient: SteamEconMarketClient,
  authManager: SteamOpenIdAuthManager,
): void {
  server.registerTool(
    'steam_get_market_eligibility',
    {
      title: 'Get Steam Market eligibility',
      description:
        'Check whether a Steam account is allowed to use the Steam Market using a publisher key. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
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
          data: await econMarketClient.getMarketEligibility({
            steamId: resolveSteamId(args.steamId, authManager),
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_market_asset_id',
    {
      title: 'Get Steam Market asset ID',
      description: 'Get the asset ID for one Steam Market listing using a publisher key.',
      inputSchema: {
        appid: z.number().int().positive(),
        listingId: uint64Schema,
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
          data: await econMarketClient.getAssetId(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_market_popular',
    {
      title: 'Get popular Steam Market items',
      description: 'Get popular Steam Market items using a publisher key.',
      inputSchema: {
        language: z.string().min(2).optional(),
        rows: z.number().int().positive().max(100).optional(),
        start: z.number().int().nonnegative().optional(),
        filterAppid: z.number().int().positive().optional(),
        currency: z.number().int().positive().optional(),
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
          data: await econMarketClient.getPopular(args),
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
