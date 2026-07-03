import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { buildAuthorizedUserOverview } from '../auth/authorized-overview.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamPlayerClient } from '../steam/player-client.js';
import type { SteamWebApiClient } from '../steam/web-api-client.js';
import type { SteamWishlistClient } from '../steam/wishlist-client.js';

export function registerAuthorizedUserTools(
  server: McpServer,
  authManager: SteamOpenIdAuthManager,
  playerClient: SteamPlayerClient,
  wishlistClient: SteamWishlistClient,
  webApiClient: SteamWebApiClient,
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
        includeFollowedGames: z.boolean().optional(),
        includeFollowedGamesCount: z.boolean().optional(),
        includeSteamLevel: z.boolean().optional(),
        includeBadges: z.boolean().optional(),
        includeFriends: z.boolean().optional(),
        includePlayerBans: z.boolean().optional(),
        ownedGamesIncludeAppInfo: z.boolean().optional(),
        ownedGamesIncludePlayedFreeGames: z.boolean().optional(),
        ownedGamesAppidsFilter: z.array(z.number().int().positive()).min(1).max(100).optional(),
        recentlyPlayedCount: z.number().int().positive().max(100).optional(),
        friendsRelationship: z.string().min(1).max(32).optional(),
        achievementAppids: z.array(z.number().int().positive()).min(1).max(25).optional(),
        statsAppids: z.array(z.number().int().positive()).min(1).max(25).optional(),
        gameLanguage: z.string().min(2).optional(),
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
          data: await buildAuthorizedUserOverview(authManager, playerClient, wishlistClient, webApiClient, args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
