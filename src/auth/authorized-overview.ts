import { SteamMcpError, toSteamMcpError } from '../common/errors.js';
import type { SteamPlayerClient } from '../steam/player-client.js';
import type { SteamWishlistClient } from '../steam/wishlist-client.js';
import type { AuthStatusResult, SteamOpenIdAuthManager } from './session.js';

type AuthorizedOverviewPlayerClient = Pick<
  SteamPlayerClient,
  'getOwnedGames' | 'getPlayerSummary' | 'getRecentlyPlayedGames'
>;

type AuthorizedOverviewWishlistClient = Pick<SteamWishlistClient, 'getWishlist' | 'getWishlistItemCount'>;

export type AuthorizedUserOverviewOptions = {
  includeProfile?: boolean;
  includeOwnedGames?: boolean;
  includeRecentlyPlayedGames?: boolean;
  includeWishlist?: boolean;
  includeWishlistItemCount?: boolean;
  ownedGamesIncludeAppInfo?: boolean;
  ownedGamesIncludePlayedFreeGames?: boolean;
  ownedGamesAppidsFilter?: number[];
  recentlyPlayedCount?: number;
};

export type OverviewSection =
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

export type AuthorizedUserOverview = {
  steamId: string;
  auth: AuthStatusResult;
  sections: Record<string, OverviewSection>;
};

export async function buildAuthorizedUserOverview(
  authManager: Pick<SteamOpenIdAuthManager, 'getStatus'>,
  playerClient: AuthorizedOverviewPlayerClient,
  wishlistClient: AuthorizedOverviewWishlistClient,
  options: AuthorizedUserOverviewOptions = {},
): Promise<AuthorizedUserOverview> {
  const authStatus = authManager.getStatus();
  const steamId = resolveAuthenticatedSteamId(authStatus.authenticatedSteamIds);
  const sections: Record<string, OverviewSection> = {};

  if (options.includeProfile ?? true) {
    sections.profile = await readOverviewSection(() => playerClient.getPlayerSummary({ steamId }));
  }

  if (options.includeOwnedGames ?? true) {
    sections.ownedGames = await readOverviewSection(() =>
      playerClient.getOwnedGames({
        steamId,
        appidsFilter: options.ownedGamesAppidsFilter,
        includeAppInfo: options.ownedGamesIncludeAppInfo,
        includePlayedFreeGames: options.ownedGamesIncludePlayedFreeGames,
      }),
    );
  }

  if (options.includeRecentlyPlayedGames ?? true) {
    sections.recentlyPlayedGames = await readOverviewSection(() =>
      playerClient.getRecentlyPlayedGames({
        steamId,
        count: options.recentlyPlayedCount,
      }),
    );
  }

  if (options.includeWishlist ?? true) {
    sections.wishlist = await readOverviewSection(() => wishlistClient.getWishlist({ steamId }));
  }

  if (options.includeWishlistItemCount ?? true) {
    sections.wishlistItemCount = await readOverviewSection(() => wishlistClient.getWishlistItemCount({ steamId }));
  }

  return {
    steamId,
    auth: authStatus,
    sections,
  };
}

export function resolveAuthenticatedSteamId(authenticatedSteamIds: string[]): string {
  const [steamId] = authenticatedSteamIds;

  if (!steamId) {
    throw new SteamMcpError({
      code: 'authentication_required',
      message: 'A Steam OpenID session is required before reading authorized Steam user data.',
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
