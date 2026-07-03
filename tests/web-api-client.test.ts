import { describe, expect, it } from 'vitest';

import { SteamWebApiClient } from '../src/steam/web-api-client.js';

function createWebApiClient(
  getJson: (url: URL) => Promise<unknown>,
  options: {
    webApiKey?: string | (() => string | undefined);
  } = {},
): SteamWebApiClient {
  return new SteamWebApiClient({
    http: {
      getJson,
    },
    webApiKey: options.webApiKey,
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

  it('checks whether an app version is up to date', async () => {
    let requestedUrl: URL | undefined;
    const client = createWebApiClient(async (url) => {
      requestedUrl = url;
      return {
        response: {
          success: true,
          up_to_date: true,
        },
      };
    });

    await expect(client.checkAppUpToDate({ appid: 620, version: 123 })).resolves.toMatchObject({
      query: {
        appid: 620,
        version: 123,
      },
      response: {
        success: true,
        up_to_date: true,
      },
    });
    expect(requestedUrl?.pathname).toBe('/ISteamApps/UpToDateCheck/v1/');
    expect(requestedUrl?.searchParams.get('appid')).toBe('620');
    expect(requestedUrl?.searchParams.get('version')).toBe('123');
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

  it('fetches the stats schema for a game with a Web API key', async () => {
    let requestedUrl: URL | undefined;
    const client = createWebApiClient(
      async (url) => {
        requestedUrl = url;
        return {
          game: {
            gameName: 'Portal 2',
            availableGameStats: {
              achievements: [],
              stats: [],
            },
          },
        };
      },
      {
        webApiKey: 'configured-key',
      },
    );

    await expect(client.getSchemaForGame({ appid: 620, language: 'en' })).resolves.toMatchObject({
      query: {
        appid: 620,
        language: 'en',
      },
      response: {
        game: {
          gameName: 'Portal 2',
        },
      },
    });
    expect(requestedUrl?.pathname).toBe('/ISteamUserStats/GetSchemaForGame/v2/');
    expect(requestedUrl?.searchParams.get('appid')).toBe('620');
    expect(requestedUrl?.searchParams.get('key')).toBe('configured-key');
    expect(requestedUrl?.searchParams.get('l')).toBe('en');
  });

  it('requires a Web API key before fetching game schema', async () => {
    let requestCount = 0;
    const client = createWebApiClient(async () => {
      requestCount += 1;
      return {};
    });

    await expect(client.getSchemaForGame({ appid: 620 })).rejects.toMatchObject({
      code: 'authentication_required',
    });
    expect(requestCount).toBe(0);
  });

  it('fetches the Store app list with input_json and a Web API key', async () => {
    let requestedUrl: URL | undefined;
    const client = createWebApiClient(
      async (url) => {
        requestedUrl = url;
        return {
          response: {
            apps: [
              {
                appid: 620,
                name: 'Portal 2',
              },
            ],
            last_appid: 620,
            have_more_results: false,
          },
        };
      },
      {
        webApiKey: 'configured-key',
      },
    );

    await expect(
      client.getStoreAppList({
        includeGames: true,
        includeDlc: false,
        haveDescriptionLanguage: 'en',
        lastAppid: 100,
        maxResults: 200,
      }),
    ).resolves.toMatchObject({
      response: {
        apps: [
          {
            appid: 620,
          },
        ],
      },
    });
    expect(requestedUrl?.origin).toBe('https://partner.steam-api.com');
    expect(requestedUrl?.pathname).toBe('/IStoreService/GetAppList/v1/');
    expect(requestedUrl?.searchParams.get('key')).toBe('configured-key');
    expect(JSON.parse(requestedUrl?.searchParams.get('input_json') ?? '{}')).toEqual({
      have_description_language: 'en',
      include_games: true,
      include_dlc: false,
      last_appid: 100,
      max_results: 200,
    });
  });

  it('requires a Web API key before fetching the Store app list', async () => {
    let requestCount = 0;
    const client = createWebApiClient(async () => {
      requestCount += 1;
      return {};
    });

    await expect(client.getStoreAppList({ maxResults: 10 })).rejects.toMatchObject({
      code: 'authentication_required',
    });
    expect(requestCount).toBe(0);
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
