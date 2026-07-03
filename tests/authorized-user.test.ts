import { describe, expect, it } from 'vitest';

import { buildAuthorizedUserOverview, resolveAuthenticatedSteamId } from '../src/auth/authorized-overview.js';

describe('authorized user overview helpers', () => {
  it('returns the first authenticated SteamID', () => {
    expect(resolveAuthenticatedSteamId(['76561197960434622', '76561198000000000'])).toBe('76561197960434622');
  });

  it('requires an authenticated Steam OpenID session', () => {
    expect(() => resolveAuthenticatedSteamId([])).toThrow('Steam OpenID session is required');
  });

  it('builds a partial authorized user overview with per-section errors', async () => {
    await expect(
      buildAuthorizedUserOverview(
        {
          getStatus: () => ({
            sessions: [],
            authenticatedSteamIds: ['76561197960434622'],
          }),
        },
        {
          getPlayerSummary: async ({ steamId }) => ({
            steamId,
          }),
          getOwnedGames: async () => {
            throw new Error('library is private');
          },
          getRecentlyPlayedGames: async ({ steamId }) => ({
            steamId,
            games: [],
          }),
          getSteamLevel: async ({ steamId }) => ({
            steamId,
            level: 42,
          }),
          getBadges: async ({ steamId }) => ({
            steamId,
            badges: [],
          }),
          getFriendList: async ({ steamId, relationship }) => ({
            steamId,
            relationship,
            friends: [],
          }),
          getPlayerBans: async ({ steamIds }) => ({
            players: steamIds,
          }),
          getPlayerAchievements: async ({ steamId, appid, language }) => ({
            steamId,
            appid,
            language,
            achievements: [],
          }),
          getUserStatsForGame: async ({ steamId, appid, language }) => ({
            steamId,
            appid,
            language,
            stats: [],
          }),
        },
        {
          getWishlist: async ({ steamId }) => ({
            steamId,
            items: [],
          }),
          getWishlistItemCount: async ({ steamId }) => ({
            steamId,
            count: 0,
          }),
        },
        {
          includeSteamLevel: true,
          includeBadges: true,
          includeFriends: true,
          includePlayerBans: true,
          friendsRelationship: 'friend',
          achievementAppids: [620],
          statsAppids: [440],
          gameLanguage: 'en',
        },
      ),
    ).resolves.toMatchObject({
      steamId: '76561197960434622',
      sections: {
        profile: {
          ok: true,
        },
        ownedGames: {
          ok: false,
          error: {
            message: 'library is private',
          },
        },
        wishlistItemCount: {
          ok: true,
          data: {
            count: 0,
          },
        },
        steamLevel: {
          ok: true,
          data: {
            level: 42,
          },
        },
        friends: {
          ok: true,
          data: {
            relationship: 'friend',
          },
        },
        playerBans: {
          ok: true,
        },
        achievementsByApp: {
          ok: true,
          data: {
            '620': {
              ok: true,
              data: {
                appid: 620,
              },
            },
          },
        },
        statsByApp: {
          ok: true,
          data: {
            '440': {
              ok: true,
              data: {
                appid: 440,
              },
            },
          },
        },
      },
    });
  });
});
