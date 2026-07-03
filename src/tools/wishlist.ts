import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { SteamMcpError } from '../common/errors.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamWishlistClient } from '../steam/wishlist-client.js';

export function registerWishlistTools(
  server: McpServer,
  wishlistClient: SteamWishlistClient,
  authManager: SteamOpenIdAuthManager,
): void {
  server.registerTool(
    'steam_get_official_wishlist',
    {
      title: 'Get official Steam wishlist',
      description:
        'Fetch the official IWishlistService/GetWishlist read endpoint. If steamId is omitted, use the authenticated OpenID SteamID.',
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
          data: await wishlistClient.getWishlist({
            steamId: resolveWishlistSteamId(args.steamId, authManager),
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_official_wishlist_sorted_filtered',
    {
      title: 'Get official sorted and filtered Steam wishlist',
      description:
        'Fetch the official IWishlistService/GetWishlistSortedFiltered read endpoint. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        steamId: z.string().min(1).optional(),
        context: z.record(z.unknown()).optional(),
        dataRequest: z.record(z.unknown()).optional(),
        sortOrder: z.number().int().optional(),
        filters: z.record(z.unknown()).optional(),
        startIndex: z.number().int().nonnegative().optional(),
        pageSize: z.number().int().positive().max(100).optional(),
        shareToken: z.string().optional(),
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
          data: await wishlistClient.getWishlistSortedFiltered({
            steamId: resolveWishlistSteamId(args.steamId, authManager),
            context: args.context,
            dataRequest: args.dataRequest,
            sortOrder: args.sortOrder,
            filters: args.filters,
            startIndex: args.startIndex,
            pageSize: args.pageSize,
            shareToken: args.shareToken,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_official_wishlist_item_count',
    {
      title: 'Get official Steam wishlist item count',
      description:
        'Fetch the official IWishlistService/GetWishlistItemCount read endpoint. If steamId is omitted, use the authenticated OpenID SteamID.',
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
          data: await wishlistClient.getWishlistItemCount({
            steamId: resolveWishlistSteamId(args.steamId, authManager),
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}

function resolveWishlistSteamId(explicitSteamId: string | undefined, authManager: SteamOpenIdAuthManager): string {
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
