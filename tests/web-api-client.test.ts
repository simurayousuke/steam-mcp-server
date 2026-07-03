import { describe, expect, it } from 'vitest';

import { SteamWebApiClient } from '../src/steam/web-api-client.js';

function createWebApiClient(getJson: (url: URL) => Promise<unknown>): SteamWebApiClient {
  return new SteamWebApiClient({
    http: {
      getJson,
    },
    cacheTtlMs: 60_000,
  });
}

describe('SteamWebApiClient', () => {
  it('fetches news for an app', async () => {
    let requestedUrl: URL | undefined;
    const client = createWebApiClient(async (url) => {
      requestedUrl = url;
      return {
        appnews: {
          appid: 620,
          count: 1,
          newsitems: [
            {
              gid: '1',
            },
          ],
        },
      };
    });

    await expect(client.getNewsForApp({ appid: 620, count: 1, maxLength: 120 })).resolves.toMatchObject({
      appid: 620,
      count: 1,
      newsItems: [
        {
          gid: '1',
        },
      ],
    });
    expect(requestedUrl?.pathname).toBe('/ISteamNews/GetNewsForApp/v2/');
    expect(requestedUrl?.searchParams.get('appid')).toBe('620');
    expect(requestedUrl?.searchParams.get('count')).toBe('1');
    expect(requestedUrl?.searchParams.get('maxlength')).toBe('120');
  });

  it('fetches current player count', async () => {
    const client = createWebApiClient(async () => ({
      response: {
        result: 1,
        player_count: 1234,
      },
    }));

    await expect(client.getNumberOfCurrentPlayers({ appid: 620 })).resolves.toMatchObject({
      appid: 620,
      result: 1,
      playerCount: 1234,
    });
  });

  it('maps unsuccessful current player responses to not_found', async () => {
    const client = createWebApiClient(async () => ({
      response: {
        result: 42,
      },
    }));

    await expect(client.getNumberOfCurrentPlayers({ appid: 999999999 })).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('fetches global achievement percentages', async () => {
    const client = createWebApiClient(async () => ({
      achievementpercentages: {
        achievements: [
          {
            name: 'ACH.TEST',
            percent: '50.0',
          },
        ],
      },
    }));

    await expect(client.getGlobalAchievementPercentages({ appid: 620 })).resolves.toMatchObject({
      appid: 620,
      count: 1,
      achievements: [
        {
          name: 'ACH.TEST',
          percent: '50.0',
        },
      ],
    });
  });

  it('fetches servers at address', async () => {
    let requestedUrl: URL | undefined;
    const client = createWebApiClient(async (url) => {
      requestedUrl = url;
      return {
        response: {
          success: true,
          servers: [],
        },
      };
    });

    await expect(client.getServersAtAddress({ address: '127.0.0.1' })).resolves.toMatchObject({
      address: '127.0.0.1',
      response: {
        success: true,
        servers: [],
      },
    });
    expect(requestedUrl?.pathname).toBe('/ISteamApps/GetServersAtAddress/v1/');
    expect(requestedUrl?.searchParams.get('addr')).toBe('127.0.0.1');
  });

  it('fetches named global stats for a game', async () => {
    let requestedUrl: URL | undefined;
    const client = createWebApiClient(async (url) => {
      requestedUrl = url;
      return {
        response: {
          result: 1,
          globalstats: {
            StatA: {
              total: '10',
            },
          },
        },
      };
    });

    await expect(
      client.getGlobalStatsForGame({
        appid: 620,
        statNames: ['StatA'],
      }),
    ).resolves.toMatchObject({
      query: {
        appid: 620,
        statNames: ['StatA'],
      },
      response: {
        result: 1,
      },
    });
    expect(requestedUrl?.pathname).toBe('/ISteamUserStats/GetGlobalStatsForGame/v1/');
    expect(requestedUrl?.searchParams.get('count')).toBe('1');
    expect(requestedUrl?.searchParams.get('name[0]')).toBe('StatA');
  });

  it('fetches games followed and followed game count', async () => {
    const client = createWebApiClient(async (url) => {
      if (url.pathname.includes('GetGamesFollowedCount')) {
        return {
          response: {
            followed_game_count: 2,
          },
        };
      }

      return {
        response: {
          appids: [10, 20],
        },
      };
    });

    await expect(client.getGamesFollowed({ steamId: '76561197960434622' })).resolves.toMatchObject({
      steamId: '76561197960434622',
      response: {
        appids: [10, 20],
      },
    });
    await expect(client.getGamesFollowedCount({ steamId: '76561197960434622' })).resolves.toMatchObject({
      steamId: '76561197960434622',
      response: {
        followed_game_count: 2,
      },
    });
  });
});
