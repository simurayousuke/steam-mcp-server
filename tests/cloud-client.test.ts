import { describe, expect, it } from 'vitest';

import { SteamCloudClient } from '../src/steam/cloud-client.js';

function createCloudClient(
  getJson: (url: URL) => Promise<unknown>,
  options: {
    oauthAccessToken?: string | (() => string | undefined);
  } = {},
): SteamCloudClient {
  return new SteamCloudClient({
    http: {
      getJson,
    },
    oauthAccessToken: options.oauthAccessToken,
    cacheTtlMs: 60_000,
  });
}

describe('SteamCloudClient', () => {
  it('enumerates Steam Cloud user files with an OAuth access token', async () => {
    let requestedUrl: URL | undefined;
    const client = createCloudClient(
      async (url) => {
        requestedUrl = url;
        return {
          files: [],
          total_files: 0,
        };
      },
      {
        oauthAccessToken: 'oauth-token',
      },
    );

    await expect(
      client.enumerateUserFiles({
        appid: 480,
        extendedDetails: true,
        count: 25,
        startIndex: 50,
      }),
    ).resolves.toMatchObject({
      query: {
        appid: 480,
        extendedDetails: true,
        count: 25,
        startIndex: 50,
      },
      response: {
        files: [],
        total_files: 0,
      },
    });

    expect(requestedUrl?.origin).toBe('https://api.steampowered.com');
    expect(requestedUrl?.pathname).toBe('/ICloudService/EnumerateUserFiles/v1/');
    expect(requestedUrl?.searchParams.get('format')).toBe('json');
    expect(requestedUrl?.searchParams.get('access_token')).toBe('oauth-token');
    expect(requestedUrl?.searchParams.get('appid')).toBe('480');
    expect(requestedUrl?.searchParams.get('extended_details')).toBe('1');
    expect(requestedUrl?.searchParams.get('count')).toBe('25');
    expect(requestedUrl?.searchParams.get('start_index')).toBe('50');
  });

  it('requires an OAuth access token before making requests', async () => {
    let requestCount = 0;
    const client = createCloudClient(async () => {
      requestCount += 1;
      return {};
    });

    await expect(
      client.enumerateUserFiles({
        appid: 480,
      }),
    ).rejects.toMatchObject({
      code: 'authentication_required',
    });
    expect(requestCount).toBe(0);
  });
});
