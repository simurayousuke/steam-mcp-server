import { SteamMcpError, toSteamMcpError } from '../common/errors.js';
import type { SteamPlayerClient } from '../steam/player-client.js';
import type { SteamWebApiClient } from '../steam/web-api-client.js';
import type { SteamWishlistClient } from '../steam/wishlist-client.js';
import type { AuthStatusResult, SteamOpenIdAuthManager } from './session.js';

type AuthorizedOverviewPlayerClient = Pick<
  SteamPlayerClient,
  | 'getBadges'
  | 'getFriendList'
  | 'getOwnedGames'
  | 'getPlayerAchievements'
  | 'getPlayerBans'
  | 'getPlayerSummary'
  | 'getRecentlyPlayedGames'
  | 'getSteamLevel'
  | 'getUserStatsForGame'
>;

type AuthorizedOverviewWishlistClient = Pick<SteamWishlistClient, 'getWishlist' | 'getWishlistItemCount'>;

type AuthorizedOverviewWebApiClient = Pick<SteamWebApiClient, 'getGamesFollowed' | 'getGamesFollowedCount'>;

export type AuthorizedUserOverviewOptions = {
  includeProfile?: boolean;
  includeOwnedGames?: boolean;
  includeRecentlyPlayedGames?: boolean;
  includeWishlist?: boolean;
  includeWishlistItemCount?: boolean;
  includeFollowedGames?: boolean;
  includeFollowedGamesCount?: boolean;
  includeSteamLevel?: boolean;
  includeBadges?: boolean;
  includeFriends?: boolean;
  includePlayerBans?: boolean;
  ownedGamesIncludeAppInfo?: boolean;
  ownedGamesIncludePlayedFreeGames?: boolean;
  ownedGamesAppidsFilter?: number[];
  recentlyPlayedCount?: number;
  friendsRelationship?: string;
  achievementAppids?: number[];
  statsAppids?: number[];
  gameLanguage?: string;
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
  webApiClient: AuthorizedOverviewWebApiClient,
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

  if (options.includeFollowedGames ?? true) {
    sections.followedGames = await readOverviewSection(() => webApiClient.getGamesFollowed({ steamId }));
  }

  if (options.includeFollowedGamesCount ?? true) {
    sections.followedGamesCount = await readOverviewSection(() => webApiClient.getGamesFollowedCount({ steamId }));
  }

  if (options.includeSteamLevel ?? false) {
    sections.steamLevel = await readOverviewSection(() => playerClient.getSteamLevel({ steamId }));
  }

  if (options.includeBadges ?? false) {
    sections.badges = await readOverviewSection(() => playerClient.getBadges({ steamId }));
  }

  if (options.includeFriends ?? false) {
    sections.friends = await readOverviewSection(() =>
      playerClient.getFriendList({
        steamId,
        relationship: options.friendsRelationship,
      }),
    );
  }

  if (options.includePlayerBans ?? false) {
    sections.playerBans = await readOverviewSection(() =>
      playerClient.getPlayerBans({
        steamIds: [steamId],
      }),
    );
  }

  if (options.achievementAppids && options.achievementAppids.length > 0) {
    sections.achievementsByApp = {
      ok: true,
      data: await readAppSections(options.achievementAppids, (appid) =>
        playerClient.getPlayerAchievements({
          steamId,
          appid,
          language: options.gameLanguage,
        }),
      ),
    };
  }

  if (options.statsAppids && options.statsAppids.length > 0) {
    sections.statsByApp = {
      ok: true,
      data: await readAppSections(options.statsAppids, (appid) =>
        playerClient.getUserStatsForGame({
          steamId,
          appid,
          language: options.gameLanguage,
        }),
      ),
    };
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

async function readAppSections(
  appids: number[],
  read: (appid: number) => Promise<Record<string, unknown>>,
): Promise<Record<string, OverviewSection>> {
  const sections: Record<string, OverviewSection> = {};

  for (const appid of appids) {
    sections[String(appid)] = await readOverviewSection(() => read(appid));
  }

  return sections;
}
