import { describe, expect, it } from 'vitest';

import { SteamStoreClient } from '../src/steam/store-client.js';

function createStoreClient(getJson: (url: URL) => Promise<unknown>): SteamStoreClient {
  return new SteamStoreClient({
    http: {
      getJson,
    },
    country: 'US',
    language: 'en',
    cacheTtlMs: 60_000,
  });
}

describe('SteamStoreClient', () => {
  it('searches apps and applies the requested limit', async () => {
    const client = createStoreClient(async () => ({
      total: 2,
      items: [
        {
          id: 620,
          name: 'Portal 2',
        },
        {
          id: 400,
          name: 'Portal',
        },
      ],
    }));

    await expect(client.searchApps({ term: 'portal', limit: 1 })).resolves.toMatchObject({
      total: 2,
      items: [
        {
          id: 620,
          name: 'Portal 2',
        },
      ],
    });
  });

  it('returns app details for successful app responses', async () => {
    const client = createStoreClient(async () => ({
      '620': {
        success: true,
        data: {
          name: 'Portal 2',
        },
      },
    }));

    await expect(client.getAppDetails({ appid: 620 })).resolves.toMatchObject({
      appid: 620,
      data: {
        name: 'Portal 2',
      },
    });
  });

  it('returns not_found for unsuccessful app responses', async () => {
    const client = createStoreClient(async () => ({
      '999999999': {
        success: false,
      },
    }));

    await expect(client.getAppDetails({ appid: 999999999 })).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('returns app review summaries and rows', async () => {
    const client = createStoreClient(async () => ({
      success: 1,
      query_summary: {
        review_score: 9,
      },
      reviews: [
        {
          recommendationid: '1',
        },
      ],
      cursor: 'next',
    }));

    await expect(client.getAppReviews({ appid: 620, numPerPage: 1 })).resolves.toMatchObject({
      appid: 620,
      querySummary: {
        review_score: 9,
      },
      reviews: [
        {
          recommendationid: '1',
        },
      ],
      cursor: 'next',
    });
  });

  it('returns package details for successful package responses', async () => {
    const client = createStoreClient(async () => ({
      '469': {
        success: true,
        data: {
          name: 'The Orange Box',
        },
      },
    }));

    await expect(client.getStorePackage({ packageId: 469 })).resolves.toMatchObject({
      packageId: 469,
      data: {
        name: 'The Orange Box',
      },
    });
  });

  it('returns not_found for unsuccessful package responses', async () => {
    const client = createStoreClient(async () => ({
      '999999999': {
        success: false,
      },
    }));

    await expect(client.getStorePackage({ packageId: 999999999 })).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('requires exactly one wishlist identity', async () => {
    const client = createStoreClient(async () => ({}));

    await expect(client.getPublicWishlist({})).rejects.toMatchObject({
      code: 'validation_error',
    });

    await expect(
      client.getPublicWishlist({
        steamId: '76561197960434622',
        vanityName: 'somebody',
      }),
    ).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('normalizes public wishlist entries keyed by appid', async () => {
    const client = createStoreClient(async () => ({
      '620': {
        name: 'Portal 2',
      },
    }));

    await expect(
      client.getPublicWishlist({
        steamId: '76561197960434622',
      }),
    ).resolves.toMatchObject({
      count: 1,
      apps: [
        {
          appid: 620,
          data: {
            name: 'Portal 2',
          },
        },
      ],
    });
  });
});
