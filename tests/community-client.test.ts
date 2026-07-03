import { describe, expect, it } from 'vitest';

import { SteamCommunityClient } from '../src/steam/community-client.js';

function createCommunityClient(getJson: (url: URL) => Promise<unknown>): SteamCommunityClient {
  return new SteamCommunityClient({
    http: {
      getJson,
    },
    language: 'en',
    cacheTtlMs: 60_000,
  });
}

describe('SteamCommunityClient', () => {
  it('fetches public inventory data', async () => {
    let requestedUrl: URL | undefined;
    const client = createCommunityClient(async (url) => {
      requestedUrl = url;
      return {
        success: 1,
        assets: [
          {
            assetid: '1',
          },
        ],
        descriptions: [
          {
            classid: '2',
          },
        ],
        more_items: false,
        total_inventory_count: 1,
      };
    });

    await expect(
      client.getPublicInventory({
        steamId: '76561197960434622',
        appid: 753,
        contextId: '6',
        count: 10,
      }),
    ).resolves.toMatchObject({
      totalInventoryCount: 1,
      assets: [
        {
          assetid: '1',
        },
      ],
      descriptions: [
        {
          classid: '2',
        },
      ],
    });
    expect(requestedUrl?.toString()).toBe('https://steamcommunity.com/inventory/76561197960434622/753/6?l=en&count=10');
  });

  it('maps unsuccessful inventory responses to private_or_forbidden', async () => {
    const client = createCommunityClient(async () => ({
      success: false,
      assets: [],
      descriptions: [],
    }));

    await expect(
      client.getPublicInventory({
        steamId: 'private',
        appid: 753,
        contextId: '6',
      }),
    ).rejects.toMatchObject({
      code: 'private_or_forbidden',
    });
  });
});
