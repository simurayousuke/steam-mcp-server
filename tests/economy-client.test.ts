import { describe, expect, it } from 'vitest';

import { SteamEconomyClient } from '../src/steam/economy-client.js';

function createEconomyClient(
  getJson: (url: URL) => Promise<unknown>,
  options: {
    webApiKey?: string | (() => string | undefined);
  } = {},
): SteamEconomyClient {
  return new SteamEconomyClient({
    http: {
      getJson,
    },
    webApiKey: options.webApiKey,
    cacheTtlMs: 60_000,
  });
}

describe('SteamEconomyClient', () => {
  it('fetches asset class info with indexed class parameters', async () => {
    let requestedUrl: URL | undefined;
    const client = createEconomyClient(
      async (url) => {
        requestedUrl = url;
        return {
          result: {
            '123': {
              name: 'Asset',
            },
          },
        };
      },
      {
        webApiKey: 'configured-key',
      },
    );

    await expect(
      client.getAssetClassInfo({
        appid: 440,
        language: 'en',
        assetClasses: [
          {
            classId: '123',
            instanceId: '456',
          },
          {
            classId: '789',
          },
        ],
      }),
    ).resolves.toMatchObject({
      query: {
        appid: 440,
        assetClasses: [
          {
            classId: '123',
            instanceId: '456',
          },
          {
            classId: '789',
          },
        ],
      },
      response: {
        result: {
          '123': {
            name: 'Asset',
          },
        },
      },
    });

    expect(requestedUrl?.origin).toBe('https://api.steampowered.com');
    expect(requestedUrl?.pathname).toBe('/ISteamEconomy/GetAssetClassInfo/v1/');
    expect(requestedUrl?.searchParams.get('key')).toBe('configured-key');
    expect(requestedUrl?.searchParams.get('appid')).toBe('440');
    expect(requestedUrl?.searchParams.get('language')).toBe('en');
    expect(requestedUrl?.searchParams.get('class_count')).toBe('2');
    expect(requestedUrl?.searchParams.get('classid0')).toBe('123');
    expect(requestedUrl?.searchParams.get('instanceid0')).toBe('456');
    expect(requestedUrl?.searchParams.get('classid1')).toBe('789');
    expect(requestedUrl?.searchParams.has('instanceid1')).toBe(false);
  });

  it('fetches asset prices', async () => {
    let requestedUrl: URL | undefined;
    const client = createEconomyClient(
      async (url) => {
        requestedUrl = url;
        return {
          result: {
            assets: [],
          },
        };
      },
      {
        webApiKey: 'configured-key',
      },
    );

    await expect(
      client.getAssetPrices({
        appid: 440,
        currency: 'USD',
        language: 'en',
      }),
    ).resolves.toMatchObject({
      query: {
        appid: 440,
        currency: 'USD',
        language: 'en',
      },
      response: {
        result: {
          assets: [],
        },
      },
    });
    expect(requestedUrl?.pathname).toBe('/ISteamEconomy/GetAssetPrices/v1/');
    expect(requestedUrl?.searchParams.get('appid')).toBe('440');
    expect(requestedUrl?.searchParams.get('currency')).toBe('USD');
    expect(requestedUrl?.searchParams.get('language')).toBe('en');
  });

  it('requires a Web API key before making requests', async () => {
    let requestCount = 0;
    const client = createEconomyClient(async () => {
      requestCount += 1;
      return {};
    });

    await expect(
      client.getAssetPrices({
        appid: 440,
      }),
    ).rejects.toMatchObject({
      code: 'authentication_required',
    });
    expect(requestCount).toBe(0);
  });
});
