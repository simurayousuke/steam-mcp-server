import { describe, expect, it } from 'vitest';

import { SteamPlayerClient } from '../src/steam/player-client.js';

describe('SteamPlayerClient', () => {
  it('injects the configured Web API key and requested SteamID', async () => {
    let requestedUrl: URL | undefined;
    const client = new SteamPlayerClient({
      webApiKey: 'configured-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url: URL) => {
          requestedUrl = url;
          return {
            response: {
              players: [],
            },
          };
        },
      },
    });

    await client.getPlayerSummary({
      steamId: '76561197960434622',
    });

    expect(requestedUrl?.origin).toBe('https://api.steampowered.com');
    expect(requestedUrl?.pathname).toBe('/ISteamUser/GetPlayerSummaries/v2/');
    expect(requestedUrl?.searchParams.get('key')).toBe('configured-key');
    expect(requestedUrl?.searchParams.get('steamids')).toBe('76561197960434622');
  });

  it('fetches player summaries for multiple SteamIDs', async () => {
    let requestedUrl: URL | undefined;
    const client = new SteamPlayerClient({
      webApiKey: 'configured-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url) => {
          requestedUrl = url;
          return {
            response: {
              players: [],
            },
          };
        },
      },
    });

    await client.getPlayerSummaries({
      steamIds: ['76561197960434622', '76561198000000000'],
    });

    expect(requestedUrl?.pathname).toBe('/ISteamUser/GetPlayerSummaries/v2/');
    expect(requestedUrl?.searchParams.get('steamids')).toBe('76561197960434622,76561198000000000');
  });

  it('requires STEAM_WEB_API_KEY before making requests', async () => {
    let requestCount = 0;
    const client = new SteamPlayerClient({
      cacheTtlMs: 60_000,
      http: {
        getJson: async () => {
          requestCount += 1;
          return {};
        },
      },
    });

    await expect(
      client.getOwnedGames({
        steamId: '76561197960434622',
      }),
    ).rejects.toMatchObject({
      code: 'authentication_required',
    });
    expect(requestCount).toBe(0);
  });

  it('caches identical player API calls', async () => {
    let requestCount = 0;
    const client = new SteamPlayerClient({
      webApiKey: 'configured-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async () => {
          requestCount += 1;
          return {
            response: {
              game_count: 0,
            },
          };
        },
      },
    });

    const first = await client.getOwnedGames({
      steamId: '76561197960434622',
    });
    const second = await client.getOwnedGames({
      steamId: '76561197960434622',
    });

    expect(first.request).toMatchObject({
      cache: 'miss',
    });
    expect(second.request).toMatchObject({
      cache: 'hit',
    });
    expect(requestCount).toBe(1);
  });

  it('sends owned games app filters as indexed query parameters', async () => {
    let requestedUrl: URL | undefined;
    const client = new SteamPlayerClient({
      webApiKey: 'configured-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url) => {
          requestedUrl = url;
          return {
            response: {
              games: [],
            },
          };
        },
      },
    });

    await client.getOwnedGames({
      steamId: '76561197960434622',
      appidsFilter: [620, 400],
      includeAppInfo: false,
      includePlayedFreeGames: false,
    });

    expect(requestedUrl?.pathname).toBe('/IPlayerService/GetOwnedGames/v1/');
    expect(requestedUrl?.searchParams.get('appids_filter[0]')).toBe('620');
    expect(requestedUrl?.searchParams.get('appids_filter[1]')).toBe('400');
    expect(requestedUrl?.searchParams.get('include_appinfo')).toBe('false');
    expect(requestedUrl?.searchParams.get('include_played_free_games')).toBe('false');
  });

  it('calls Steam friend list with relationship filters', async () => {
    let requestedUrl: URL | undefined;
    const client = new SteamPlayerClient({
      webApiKey: 'configured-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url) => {
          requestedUrl = url;
          return {
            friendslist: {
              friends: [],
            },
          };
        },
      },
    });

    await client.getFriendList({
      steamId: '76561197960434622',
      relationship: 'friend',
    });

    expect(requestedUrl?.pathname).toBe('/ISteamUser/GetFriendList/v1/');
    expect(requestedUrl?.searchParams.get('steamid')).toBe('76561197960434622');
    expect(requestedUrl?.searchParams.get('relationship')).toBe('friend');
  });

  it('calls Steam player service profile endpoints', async () => {
    const requestedPaths: string[] = [];
    const requestedParams: Record<string, string | null>[] = [];
    const client = new SteamPlayerClient({
      webApiKey: 'configured-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url) => {
          requestedPaths.push(url.pathname);
          requestedParams.push({
            appid: url.searchParams.get('appid'),
            badgeid: url.searchParams.get('badgeid'),
            steamid: url.searchParams.get('steamid'),
          });
          return {
            response: {},
          };
        },
      },
    });

    await client.getSingleGamePlaytime({
      steamId: '76561197960434622',
      appid: 620,
    });
    await client.getSteamLevel({
      steamId: '76561197960434622',
    });
    await client.getBadges({
      steamId: '76561197960434622',
    });
    await client.getCommunityBadgeProgress({
      steamId: '76561197960434622',
      badgeid: 2,
    });

    expect(requestedPaths).toEqual([
      '/IPlayerService/GetSingleGamePlaytime/v1/',
      '/IPlayerService/GetSteamLevel/v1/',
      '/IPlayerService/GetBadges/v1/',
      '/IPlayerService/GetCommunityBadgeProgress/v1/',
    ]);
    expect(requestedParams).toEqual([
      {
        appid: '620',
        badgeid: null,
        steamid: '76561197960434622',
      },
      {
        appid: null,
        badgeid: null,
        steamid: '76561197960434622',
      },
      {
        appid: null,
        badgeid: null,
        steamid: '76561197960434622',
      },
      {
        appid: null,
        badgeid: '2',
        steamid: '76561197960434622',
      },
    ]);
  });

  it('calls Steam player bans with comma-separated SteamIDs', async () => {
    let requestedUrl: URL | undefined;
    const client = new SteamPlayerClient({
      webApiKey: 'configured-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url) => {
          requestedUrl = url;
          return {
            players: [],
          };
        },
      },
    });

    await client.getPlayerBans({
      steamIds: ['76561197960434622', '76561198000000000'],
    });

    expect(requestedUrl?.pathname).toBe('/ISteamUser/GetPlayerBans/v1/');
    expect(requestedUrl?.searchParams.get('steamids')).toBe('76561197960434622,76561198000000000');
  });

  it('uses a dynamic Web API key provider', async () => {
    let webApiKey: string | undefined;
    let requestedUrl: URL | undefined;
    const client = new SteamPlayerClient({
      webApiKey: () => webApiKey,
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url) => {
          requestedUrl = url;
          return {
            response: {
              players: [],
            },
          };
        },
      },
    });

    await expect(
      client.getPlayerSummary({
        steamId: '76561197960434622',
      }),
    ).rejects.toMatchObject({
      code: 'authentication_required',
    });

    webApiKey = 'session-key';
    await client.getPlayerSummary({
      steamId: '76561197960434622',
    });

    expect(requestedUrl?.searchParams.get('key')).toBe('session-key');
  });
});
