import { describe, expect, it } from 'vitest';

import { SteamWishlistClient } from '../src/steam/wishlist-client.js';

function createWishlistClient(getJson: (url: URL) => Promise<unknown>): SteamWishlistClient {
  return new SteamWishlistClient({
    http: {
      getJson,
    },
    cacheTtlMs: 60_000,
  });
}

describe('SteamWishlistClient', () => {
  it('fetches official wishlist items', async () => {
    let requestedUrl: URL | undefined;
    const client = createWishlistClient(async (url) => {
      requestedUrl = url;
      return {
        response: {
          items: [
            {
              appid: 620,
              priority: 1,
            },
          ],
        },
      };
    });

    await expect(client.getWishlist({ steamId: '76561197960434622' })).resolves.toMatchObject({
      steamId: '76561197960434622',
      count: 1,
      items: [
        {
          appid: 620,
        },
      ],
    });
    expect(requestedUrl?.pathname).toBe('/IWishlistService/GetWishlist/v1/');
    expect(requestedUrl?.searchParams.get('steamid')).toBe('76561197960434622');
    expect(requestedUrl?.searchParams.get('format')).toBe('json');
  });

  it('fetches official wishlist item count', async () => {
    let requestedUrl: URL | undefined;
    const client = createWishlistClient(async (url) => {
      requestedUrl = url;
      return {
        response: {
          count: 41,
        },
      };
    });

    await expect(client.getWishlistItemCount({ steamId: '76561197960434622' })).resolves.toMatchObject({
      steamId: '76561197960434622',
      count: 41,
    });
    expect(requestedUrl?.pathname).toBe('/IWishlistService/GetWishlistItemCount/v1/');
    expect(requestedUrl?.searchParams.get('steamid')).toBe('76561197960434622');
  });

  it('normalizes an absent count to zero', async () => {
    const client = createWishlistClient(async () => ({
      response: {},
    }));

    await expect(client.getWishlistItemCount({ steamId: '76561197960434622' })).resolves.toMatchObject({
      count: 0,
    });
  });
});
