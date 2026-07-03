import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { SteamMcpError } from '../common/errors.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamCommunityClient } from '../steam/community-client.js';

export function registerCommunityTools(
  server: McpServer,
  communityClient: SteamCommunityClient,
  authManager: SteamOpenIdAuthManager,
): void {
  server.registerTool(
    'steam_get_public_inventory',
    {
      title: 'Get public Steam inventory',
      description: 'Fetch a public Steam Community inventory. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        appid: z.number().int().positive(),
        contextId: z.string().min(1),
        steamId: z.string().min(1).optional(),
        count: z.number().int().positive().max(5000).optional(),
        language: z.string().min(2).optional(),
        startAssetId: z.string().min(1).optional(),
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
          data: await communityClient.getPublicInventory({
            steamId: resolveSteamId(args.steamId, authManager),
            appid: args.appid,
            contextId: args.contextId,
            count: args.count,
            language: args.language,
            startAssetId: args.startAssetId,
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
