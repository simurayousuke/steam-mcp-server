import { describe, expect, it } from 'vitest';

import { SteamAppSpecificClient } from '../src/steam/app-specific-client.js';

function createAppSpecificClient(getJson: (url: URL) => Promise<unknown>): SteamAppSpecificClient {
  return new SteamAppSpecificClient({
    http: {
      getJson,
    },
    cacheTtlMs: 60_000,
  });
}

describe('SteamAppSpecificClient', () => {
  it('fetches Game Coordinator client and server versions by appid', async () => {
    const requestedPaths: string[] = [];
    const client = createAppSpecificClient(async (url) => {
      requestedPaths.push(url.pathname);
      return {
        result: {
          success: true,
          active_version: 123,
        },
      };
    });

    await expect(client.getGcClientVersion({ appid: 440 })).resolves.toMatchObject({
      query: {
        appid: 440,
      },
      response: {
        result: {
          success: true,
        },
      },
    });
    await expect(client.getGcServerVersion({ appid: 730 })).resolves.toMatchObject({
      query: {
        appid: 730,
      },
      response: {
        result: {
          active_version: 123,
        },
      },
    });

    expect(requestedPaths).toEqual([
      '/IGCVersion_440/GetClientVersion/v1/',
      '/IGCVersion_730/GetServerVersion/v1/',
    ]);
  });

  it('fetches Portal 2 bucketized leaderboard data', async () => {
    let requestedUrl: URL | undefined;
    const client = createAppSpecificClient(async (url) => {
      requestedUrl = url;
      return {
        bucketizedData: {},
      };
    });

    await expect(
      client.getPortal2LeaderboardBucketizedData({
        leaderboardName: 'MP_COOP_Fling_3',
      }),
    ).resolves.toMatchObject({
      query: {
        leaderboardName: 'MP_COOP_Fling_3',
      },
      response: {
        bucketizedData: {},
      },
    });
    expect(requestedUrl?.pathname).toBe('/IPortal2Leaderboards_620/GetBucketizedData/v1/');
    expect(requestedUrl?.searchParams.get('leaderboardName')).toBe('MP_COOP_Fling_3');
  });

  it('fetches Team Fortress 2 world status', async () => {
    let requestedUrl: URL | undefined;
    const client = createAppSpecificClient(async (url) => {
      requestedUrl = url;
      return {
        result: {
          active_client_version: 123,
        },
      };
    });

    await expect(client.getTf2WorldStatus()).resolves.toMatchObject({
      response: {
        result: {
          active_client_version: 123,
        },
      },
    });
    expect(requestedUrl?.pathname).toBe('/ITFSystem_440/GetWorldStatus/v1/');
  });
});
