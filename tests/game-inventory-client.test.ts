import { describe, expect, it } from 'vitest';

import { SteamGameInventoryClient } from '../src/steam/game-inventory-client.js';

function createGameInventoryClient(
  getJson: (url: URL) => Promise<unknown>,
  options: {
    publisherKey?: string | (() => string | undefined);
  } = {},
): SteamGameInventoryClient {
  return new SteamGameInventoryClient({
    http: {
      getJson,
    },
    publisherKey: options.publisherKey,
    cacheTtlMs: 60_000,
  });
}

describe('SteamGameInventoryClient', () => {
  it('fetches history command details', async () => {
    let requestedUrl: URL | undefined;
    const client = createGameInventoryClient(
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

    await client.getHistoryCommandDetails({
      appid: 480,
      steamId: '76561197960434622',
      command: 'rollback',
      contextId: '2',
      commandArguments: 'asset=123',
    });

    expect(requestedUrl?.origin).toBe('https://partner.steam-api.com');
    expect(requestedUrl?.pathname).toBe('/IGameInventory/GetHistoryCommandDetails/v1/');
    expect(requestedUrl?.searchParams.get('appid')).toBe('480');
    expect(requestedUrl?.searchParams.get('steamid')).toBe('76561197960434622');
    expect(requestedUrl?.searchParams.get('command')).toBe('rollback');
    expect(requestedUrl?.searchParams.get('contextid')).toBe('2');
    expect(requestedUrl?.searchParams.get('arguments')).toBe('asset=123');
  });

  it('fetches user and asset history', async () => {
    const requestedPaths: string[] = [];
    const requestedParams: Record<string, string | null>[] = [];
    const client = createGameInventoryClient(
      async (url) => {
        requestedPaths.push(url.pathname);
        requestedParams.push({
          appid: url.searchParams.get('appid'),
          assetid: url.searchParams.get('assetid'),
          contextid: url.searchParams.get('contextid'),
          steamid: url.searchParams.get('steamid'),
          starttime: url.searchParams.get('starttime'),
          endtime: url.searchParams.get('endtime'),
        });
        return {
          response: {},
        };
      },
      {
        publisherKey: 'publisher-key',
      },
    );

    await client.getUserHistory({
      appid: 480,
      steamId: '76561197960434622',
      contextId: '2',
      startTime: 1000,
      endTime: 2000,
    });
    await client.supportGetAssetHistory({
      appid: 480,
      assetId: '123',
      contextId: '2',
    });

    expect(requestedPaths).toEqual(['/IGameInventory/GetUserHistory/v1/', '/IGameInventory/SupportGetAssetHistory/v1/']);
    expect(requestedParams).toEqual([
      {
        appid: '480',
        assetid: null,
        contextid: '2',
        steamid: '76561197960434622',
        starttime: '1000',
        endtime: '2000',
      },
      {
        appid: '480',
        assetid: '123',
        contextid: '2',
        steamid: null,
        starttime: null,
        endtime: null,
      },
    ]);
  });

  it('requires a publisher key before making requests', async () => {
    let requestCount = 0;
    const client = createGameInventoryClient(async () => {
      requestCount += 1;
      return {};
    });

    await expect(
      client.supportGetAssetHistory({
        appid: 480,
        assetId: '123',
        contextId: '2',
      }),
    ).rejects.toMatchObject({
      code: 'authorization_required',
    });
    expect(requestCount).toBe(0);
  });
});
