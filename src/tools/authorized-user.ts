import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { buildAuthorizedUserOverview } from '../auth/authorized-overview.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamPlayerClient } from '../steam/player-client.js';
import type { SteamWishlistClient } from '../steam/wishlist-client.js';

export function registerAuthorizedUserTools(
  server: McpServer,
  authManager: SteamOpenIdAuthManager,
  playerClient: SteamPlayerClient,
  wishlistClient: SteamWishlistClient,
): void {
  server.registerTool(
    'steam_get_authorized_user_overview',
    {
      title: 'Get authorized Steam user overview',
      description:
        'Build a read-only overview for the authenticated OpenID SteamID, optionally including profile, owned games, recently played games, and wishlist data.',
      inputSchema: {
        includeProfile: z.boolean().optional(),
        includeOwnedGames: z.boolean().optional(),
        includeRecentlyPlayedGames: z.boolean().optional(),
        includeWishlist: z.boolean().optional(),
        includeWishlistItemCount: z.boolean().optional(),
        ownedGamesIncludeAppInfo: z.boolean().optional(),
        ownedGamesIncludePlayedFreeGames: z.boolean().optional(),
        ownedGamesAppidsFilter: z.array(z.number().int().positive()).min(1).max(100).optional(),
        recentlyPlayedCount: z.number().int().positive().max(100).optional(),
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
          data: await buildAuthorizedUserOverview(authManager, playerClient, wishlistClient, args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
