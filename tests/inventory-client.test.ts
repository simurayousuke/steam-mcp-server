import { describe, expect, it } from 'vitest';

import { SteamInventoryClient } from '../src/steam/inventory-client.js';

function createInventoryClient(
  getJson: (url: URL) => Promise<unknown>,
  options: {
    publisherKey?: string | (() => string | undefined);
  } = {},
): SteamInventoryClient {
  return new SteamInventoryClient({
    http: {
      getJson,
    },
    publisherKey: options.publisherKey,
    cacheTtlMs: 60_000,
  });
}

describe('SteamInventoryClient', () => {
  it('fetches Inventory Service inventory using input_json', async () => {
    let requestedUrl: URL | undefined;
    const client = createInventoryClient(
      async (url) => {
        requestedUrl = url;
        return {
          response: {
            item_json: '[]',
          },
        };
      },
      {
        publisherKey: 'publisher-key',
      },
    );

    await expect(
      client.getInventory({
        appid: 480,
        steamId: '76561197960434622',
      }),
    ).resolves.toMatchObject({
      query: {
        appid: 480,
        steamId: '76561197960434622',
      },
    });

    expect(requestedUrl?.origin).toBe('https://partner.steam-api.com');
    expect(requestedUrl?.pathname).toBe('/IInventoryService/GetInventory/v1/');
    expect(requestedUrl?.searchParams.get('format')).toBe('json');
    expect(requestedUrl?.searchParams.get('key')).toBe('publisher-key');
    expect(JSON.parse(requestedUrl?.searchParams.get('input_json') ?? '{}')).toEqual({
      appid: 480,
      steamid: '76561197960434622',
    });
  });

  it('fetches item definitions with optional filters', async () => {
    let requestedUrl: URL | undefined;
    const client = createInventoryClient(
      async (url) => {
        requestedUrl = url;
        return {
          response: {
            itemdef_json: '[]',
          },
        };
      },
      {
        publisherKey: 'publisher-key',
      },
    );

    await client.getItemDefs({
      appid: 480,
      modifiedSince: '20260703T120000Z',
      itemdefIds: ['100', '101'],
      workshopIds: ['200'],
      cacheMaxAgeSeconds: 300,
    });

    expect(requestedUrl?.pathname).toBe('/IInventoryService/GetItemDefs/v1/');
    expect(JSON.parse(requestedUrl?.searchParams.get('input_json') ?? '{}')).toEqual({
      appid: 480,
      modifiedsince: '20260703T120000Z',
      itemdefids: '100,101',
      workshopids: '200',
      cache_max_age_seconds: 300,
    });
  });

  it('fetches price sheets from the public Steam Web API host', async () => {
    let requestedUrl: URL | undefined;
    const client = createInventoryClient(
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

    await client.getPriceSheet({
      currency: 1,
    });

    expect(requestedUrl?.origin).toBe('https://api.steampowered.com');
    expect(requestedUrl?.pathname).toBe('/IInventoryService/GetPriceSheet/v1/');
    expect(JSON.parse(requestedUrl?.searchParams.get('input_json') ?? '{}')).toEqual({
      ecurrency: 1,
    });
  });

  it('fetches inventory quantities with itemdef ids', async () => {
    let requestedUrl: URL | undefined;
    const client = createInventoryClient(
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

    await client.getQuantity({
      appid: 480,
      steamId: '76561197960434622',
      itemdefIds: [' 100 ', '101'],
      force: true,
    });

    expect(requestedUrl?.pathname).toBe('/IInventoryService/GetQuantity/v1/');
    expect(JSON.parse(requestedUrl?.searchParams.get('input_json') ?? '{}')).toEqual({
      appid: 480,
      steamid: '76561197960434622',
      itemdefid: ['100', '101'],
      force: true,
    });
  });

  it('requires a publisher key before making requests', async () => {
    let requestCount = 0;
    const client = createInventoryClient(async () => {
      requestCount += 1;
      return {};
    });

    await expect(
      client.getInventory({
        appid: 480,
        steamId: '76561197960434622',
      }),
    ).rejects.toMatchObject({
      code: 'authorization_required',
    });
    expect(requestCount).toBe(0);
  });
});
