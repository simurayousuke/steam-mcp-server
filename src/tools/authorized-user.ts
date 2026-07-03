import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { SteamMcpError, toSteamMcpError } from '../common/errors.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamPlayerClient } from '../steam/player-client.js';
import type { SteamWishlistClient } from '../steam/wishlist-client.js';

type OverviewSection =
  | {
      ok: true;
      data: Record<string, unknown>;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        status?: number;
        details?: Record<string, unknown>;
      };
    };

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
        const authStatus = authManager.getStatus();
        const steamId = resolveAuthenticatedSteamId(authStatus.authenticatedSteamIds);
        const sections: Record<string, OverviewSection> = {};

        if (args.includeProfile ?? true) {
          sections.profile = await readOverviewSection(() => playerClient.getPlayerSummary({ steamId }));
        }

        if (args.includeOwnedGames ?? true) {
          sections.ownedGames = await readOverviewSection(() =>
            playerClient.getOwnedGames({
              steamId,
              appidsFilter: args.ownedGamesAppidsFilter,
              includeAppInfo: args.ownedGamesIncludeAppInfo,
              includePlayedFreeGames: args.ownedGamesIncludePlayedFreeGames,
            }),
          );
        }

        if (args.includeRecentlyPlayedGames ?? true) {
          sections.recentlyPlayedGames = await readOverviewSection(() =>
            playerClient.getRecentlyPlayedGames({
              steamId,
              count: args.recentlyPlayedCount,
            }),
          );
        }

        if (args.includeWishlist ?? true) {
          sections.wishlist = await readOverviewSection(() => wishlistClient.getWishlist({ steamId }));
        }

        if (args.includeWishlistItemCount ?? true) {
          sections.wishlistItemCount = await readOverviewSection(() => wishlistClient.getWishlistItemCount({ steamId }));
        }

        return toolSuccess({
          data: {
            steamId,
            auth: authStatus,
            sections,
          },
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}

export function resolveAuthenticatedSteamId(authenticatedSteamIds: string[]): string {
  const [steamId] = authenticatedSteamIds;

  if (!steamId) {
    throw new SteamMcpError({
      code: 'authentication_required',
      message: 'A Steam OpenID session is required before reading the authorized user overview.',
    });
  }

  return steamId;
}

async function readOverviewSection(read: () => Promise<Record<string, unknown>>): Promise<OverviewSection> {
  try {
    return {
      ok: true,
      data: await read(),
    };
  } catch (error: unknown) {
    const steamError = toSteamMcpError(error);

    return {
      ok: false,
      error: {
        code: steamError.code,
        message: steamError.message,
        status: steamError.status,
        details: steamError.details,
      },
    };
  }
}
