import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it } from 'vitest';

import { registerPlayerTools } from '../src/tools/player.js';
import { registerStoreTools } from '../src/tools/store.js';
import { registerWishlistTools } from '../src/tools/wishlist.js';

const authenticatedSteamId = '76561197960434622';
const explicitSteamId = '76561198000000000';

type CapturedCall = {
  method: string;
  payload: Record<string, unknown>;
};

describe('authorized SteamID resolution for user-scoped tools', () => {
  it('uses the authenticated OpenID SteamID for player tools when steamId is omitted', async () => {
    const captured: CapturedCall[] = [];
    const server = new McpServer({
      name: 'authorized-player-tool-resolution-test-server',
      version: '0.0.0',
    });

    registerPlayerTools(server, createPlayerClient(captured) as never, createAuthManager() as never);
    const client = await connectClient(server, 'authorized-player-tool-resolution-test-client');

    try {
      await client.callTool({ name: 'steam_get_player_summary', arguments: {} });
      await client.callTool({
        name: 'steam_get_owned_games',
        arguments: {
          includeAppInfo: true,
          includePlayedFreeGames: true,
          appidsFilter: [620],
        },
      });
      await client.callTool({ name: 'steam_get_recently_played_games', arguments: { count: 5 } });
      await client.callTool({ name: 'steam_get_single_game_playtime', arguments: { appid: 620 } });
      await client.callTool({ name: 'steam_get_steam_level', arguments: {} });
      await client.callTool({ name: 'steam_get_badges', arguments: {} });
      await client.callTool({ name: 'steam_get_community_badge_progress', arguments: { badgeid: 2 } });
      await client.callTool({ name: 'steam_get_friend_list', arguments: { relationship: 'friend' } });
      await client.callTool({ name: 'steam_get_player_bans', arguments: {} });
      await client.callTool({ name: 'steam_get_player_achievements', arguments: { appid: 620, language: 'en' } });
      await client.callTool({ name: 'steam_get_user_stats_for_game', arguments: { appid: 440, language: 'en' } });

      expect(captured).toEqual([
        {
          method: 'getPlayerSummary',
          payload: {
            steamId: authenticatedSteamId,
          },
        },
        {
          method: 'getOwnedGames',
          payload: {
            steamId: authenticatedSteamId,
            includeAppInfo: true,
            includePlayedFreeGames: true,
            appidsFilter: [620],
          },
        },
        {
          method: 'getRecentlyPlayedGames',
          payload: {
            steamId: authenticatedSteamId,
            count: 5,
          },
        },
        {
          method: 'getSingleGamePlaytime',
          payload: {
            steamId: authenticatedSteamId,
            appid: 620,
          },
        },
        {
          method: 'getSteamLevel',
          payload: {
            steamId: authenticatedSteamId,
          },
        },
        {
          method: 'getBadges',
          payload: {
            steamId: authenticatedSteamId,
          },
        },
        {
          method: 'getCommunityBadgeProgress',
          payload: {
            steamId: authenticatedSteamId,
            badgeid: 2,
          },
        },
        {
          method: 'getFriendList',
          payload: {
            steamId: authenticatedSteamId,
            relationship: 'friend',
          },
        },
        {
          method: 'getPlayerBans',
          payload: {
            steamIds: [authenticatedSteamId],
          },
        },
        {
          method: 'getPlayerAchievements',
          payload: {
            steamId: authenticatedSteamId,
            appid: 620,
            language: 'en',
          },
        },
        {
          method: 'getUserStatsForGame',
          payload: {
            steamId: authenticatedSteamId,
            appid: 440,
            language: 'en',
          },
        },
      ]);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('lets an explicit SteamID override the authenticated OpenID SteamID', async () => {
    const captured: CapturedCall[] = [];
    const server = new McpServer({
      name: 'authorized-player-tool-explicit-test-server',
      version: '0.0.0',
    });

    registerPlayerTools(server, createPlayerClient(captured) as never, createAuthManager() as never);
    const client = await connectClient(server, 'authorized-player-tool-explicit-test-client');

    try {
      await client.callTool({
        name: 'steam_get_owned_games',
        arguments: {
          steamId: explicitSteamId,
        },
      });

      expect(captured).toEqual([
        {
          method: 'getOwnedGames',
          payload: {
            steamId: explicitSteamId,
          },
        },
      ]);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('uses the authenticated OpenID SteamID for official wishlist tools when steamId is omitted', async () => {
    const captured: CapturedCall[] = [];
    const server = new McpServer({
      name: 'authorized-wishlist-tool-resolution-test-server',
      version: '0.0.0',
    });

    registerWishlistTools(server, createWishlistClient(captured) as never, createAuthManager() as never);
    const client = await connectClient(server, 'authorized-wishlist-tool-resolution-test-client');

    try {
      await client.callTool({ name: 'steam_get_official_wishlist', arguments: {} });
      await client.callTool({
        name: 'steam_get_official_wishlist_sorted_filtered',
        arguments: {
          pageSize: 25,
          startIndex: 0,
          sortOrder: 1,
          shareToken: 'share-token',
        },
      });
      await client.callTool({ name: 'steam_get_official_wishlist_item_count', arguments: {} });

      expect(captured).toEqual([
        {
          method: 'getWishlist',
          payload: {
            steamId: authenticatedSteamId,
          },
        },
        {
          method: 'getWishlistSortedFiltered',
          payload: {
            steamId: authenticatedSteamId,
            pageSize: 25,
            startIndex: 0,
            sortOrder: 1,
            shareToken: 'share-token',
          },
        },
        {
          method: 'getWishlistItemCount',
          payload: {
            steamId: authenticatedSteamId,
          },
        },
      ]);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('uses the authenticated OpenID SteamID for public Store wishlist reads when no identity argument is supplied', async () => {
    const captured: CapturedCall[] = [];
    const server = new McpServer({
      name: 'authorized-store-wishlist-tool-resolution-test-server',
      version: '0.0.0',
    });

    registerStoreTools(server, createStoreClient(captured) as never, createAuthManager() as never);
    const client = await connectClient(server, 'authorized-store-wishlist-tool-resolution-test-client');

    try {
      await client.callTool({ name: 'steam_get_user_wishlist', arguments: { page: 2 } });
      await client.callTool({ name: 'steam_get_user_wishlist', arguments: { vanityName: 'valve' } });

      expect(captured).toEqual([
        {
          method: 'getPublicWishlist',
          payload: {
            steamId: authenticatedSteamId,
            page: 2,
          },
        },
        {
          method: 'getPublicWishlist',
          payload: {
            vanityName: 'valve',
          },
        },
      ]);
    } finally {
      await client.close();
      await server.close();
    }
  });
});

function createAuthManager() {
  return {
    getStatus: () => ({
      sessions: [],
      authenticatedSteamIds: [authenticatedSteamId],
    }),
  };
}

function createPlayerClient(captured: CapturedCall[]) {
  const record = (method: string, payload: Record<string, unknown>) => {
    captured.push({ method, payload: removeUndefinedProperties(payload) });
    return { ok: true, method, payload };
  };

  return {
    resolveVanityUrl: async (payload: Record<string, unknown>) => record('resolveVanityUrl', payload),
    getPlayerSummary: async (payload: Record<string, unknown>) => record('getPlayerSummary', payload),
    getPlayerSummaries: async (payload: Record<string, unknown>) => record('getPlayerSummaries', payload),
    getOwnedGames: async (payload: Record<string, unknown>) => record('getOwnedGames', payload),
    getRecentlyPlayedGames: async (payload: Record<string, unknown>) => record('getRecentlyPlayedGames', payload),
    getSingleGamePlaytime: async (payload: Record<string, unknown>) => record('getSingleGamePlaytime', payload),
    getSteamLevel: async (payload: Record<string, unknown>) => record('getSteamLevel', payload),
    getBadges: async (payload: Record<string, unknown>) => record('getBadges', payload),
    getCommunityBadgeProgress: async (payload: Record<string, unknown>) =>
      record('getCommunityBadgeProgress', payload),
    getFriendList: async (payload: Record<string, unknown>) => record('getFriendList', payload),
    getPlayerBans: async (payload: Record<string, unknown>) => record('getPlayerBans', payload),
    getPlayerAchievements: async (payload: Record<string, unknown>) => record('getPlayerAchievements', payload),
    getUserStatsForGame: async (payload: Record<string, unknown>) => record('getUserStatsForGame', payload),
  };
}

function createWishlistClient(captured: CapturedCall[]) {
  const record = (method: string, payload: Record<string, unknown>) => {
    captured.push({ method, payload: removeUndefinedProperties(payload) });
    return { ok: true, method, payload };
  };

  return {
    getWishlist: async (payload: Record<string, unknown>) => record('getWishlist', payload),
    getWishlistSortedFiltered: async (payload: Record<string, unknown>) => record('getWishlistSortedFiltered', payload),
    getWishlistItemCount: async (payload: Record<string, unknown>) => record('getWishlistItemCount', payload),
  };
}

function createStoreClient(captured: CapturedCall[]) {
  const record = (method: string, payload: Record<string, unknown>) => {
    captured.push({ method, payload: removeUndefinedProperties(payload) });
    return { ok: true, method, payload };
  };

  return {
    searchApps: async (payload: Record<string, unknown>) => record('searchApps', payload),
    getAppDetails: async (payload: Record<string, unknown>) => record('getAppDetails', payload),
    getAppReviews: async (payload: Record<string, unknown>) => record('getAppReviews', payload),
    getStorePackage: async (payload: Record<string, unknown>) => record('getStorePackage', payload),
    getPublicWishlist: async (payload: Record<string, unknown>) => record('getPublicWishlist', payload),
  };
}

async function connectClient(server: McpServer, name: string): Promise<Client> {
  const client = new Client({
    name,
    version: '0.0.0',
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

function removeUndefinedProperties(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}
