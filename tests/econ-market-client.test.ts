import { describe, expect, it } from 'vitest';

import { SteamEconMarketClient } from '../src/steam/econ-market-client.js';

function createEconMarketClient(
  getJson: (url: URL) => Promise<unknown>,
  options: {
    publisherKey?: string | (() => string | undefined);
  } = {},
): SteamEconMarketClient {
  return new SteamEconMarketClient({
    http: {
      getJson,
    },
    publisherKey: options.publisherKey,
    cacheTtlMs: 60_000,
  });
}

describe('SteamEconMarketClient', () => {
  it('checks market eligibility using input_json', async () => {
    let requestedUrl: URL | undefined;
    const client = createEconMarketClient(
      async (url) => {
        requestedUrl = url;
        return {
          response: {},
        };
      },
      {
        publisherKey: 'publisher-key',
      },
    );

    await client.getMarketEligibility({
      steamId: '76561197960434622',
    });

    expect(requestedUrl?.origin).toBe('https://partner.steam-api.com');
    expect(requestedUrl?.pathname).toBe('/IEconMarketService/GetMarketEligibility/v1/');
    expect(requestedUrl?.searchParams.get('key')).toBe('publisher-key');
    expect(JSON.parse(requestedUrl?.searchParams.get('input_json') ?? '{}')).toEqual({
      steamid: '76561197960434622',
    });
  });

  it('fetches market asset id and popular items', async () => {
    const requestedPaths: string[] = [];
    const requestedInputs: Record<string, unknown>[] = [];
    const client = createEconMarketClient(
      async (url) => {
        requestedPaths.push(url.pathname);
        requestedInputs.push(JSON.parse(url.searchParams.get('input_json') ?? '{}'));
        return {
          response: {},
        };
      },
      {
        publisherKey: 'publisher-key',
      },
    );

    await client.getAssetId({
      appid: 730,
      listingId: '123',
    });
    await client.getPopular({
      language: 'en',
      rows: 20,
      start: 40,
      filterAppid: 730,
      currency: 1,
    });

    expect(requestedPaths).toEqual(['/IEconMarketService/GetAssetID/v1/', '/IEconMarketService/GetPopular/v1/']);
    expect(requestedInputs).toEqual([
      {
        appid: 730,
        listingid: '123',
      },
      {
        language: 'en',
        rows: 20,
        start: 40,
        filter_appid: 730,
        ecurrency: 1,
      },
    ]);
  });

  it('requires a publisher key before making requests', async () => {
    let requestCount = 0;
    const client = createEconMarketClient(async () => {
      requestCount += 1;
      return {};
    });

    await expect(
      client.getMarketEligibility({
        steamId: '76561197960434622',
      }),
    ).rejects.toMatchObject({
      code: 'authorization_required',
    });
    expect(requestCount).toBe(0);
  });
});
