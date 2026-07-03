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
});
