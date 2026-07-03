import { describe, expect, it } from 'vitest';

import { SteamPartnerFinancialsClient } from '../src/steam/partner-financials-client.js';

function createPartnerFinancialsClient(
  getJson: (url: URL) => Promise<unknown>,
  options: {
    financialKey?: string | (() => string | undefined);
  } = {},
): SteamPartnerFinancialsClient {
  return new SteamPartnerFinancialsClient({
    http: {
      getJson,
    },
    financialKey: options.financialKey,
    cacheTtlMs: 60_000,
  });
}

describe('SteamPartnerFinancialsClient', () => {
  it('fetches changed dates for partner with a financial key', async () => {
    let requestedUrl: URL | undefined;
    const client = createPartnerFinancialsClient(
      async (url) => {
        requestedUrl = url;
        return {
          response: {
            dates: [],
          },
        };
      },
      {
        financialKey: 'financial-key',
      },
    );

    await client.getChangedDatesForPartner({
      highWatermark: '0',
      includeViewGrants: true,
    });

    expect(requestedUrl?.origin).toBe('https://partner.steam-api.com');
    expect(requestedUrl?.pathname).toBe('/IPartnerFinancialsService/GetChangedDatesForPartner/v001/');
    expect(requestedUrl?.searchParams.get('key')).toBe('financial-key');
    expect(requestedUrl?.searchParams.get('highwatermark')).toBe('0');
    expect(requestedUrl?.searchParams.get('include_view_grants')).toBe('true');
  });

  it('fetches detailed sales and wishlist reporting', async () => {
    const requestedPaths: string[] = [];
    const requestedParams: Record<string, string | null>[] = [];
    const client = createPartnerFinancialsClient(
      async (url) => {
        requestedPaths.push(url.pathname);
        requestedParams.push({
          appid: url.searchParams.get('appid'),
          date: url.searchParams.get('date'),
          highwatermark_id: url.searchParams.get('highwatermark_id'),
        });
        return {
          response: {},
        };
      },
      {
        financialKey: 'financial-key',
      },
    );

    await client.getDetailedSales({
      date: '2026-07-01',
      highWatermarkId: '0',
    });
    await client.getAppWishlistReporting({
      appid: 480,
      date: '20260701',
    });

    expect(requestedPaths).toEqual([
      '/IPartnerFinancialsService/GetDetailedSales/v001/',
      '/IPartnerFinancialsService/GetAppWishlistReporting/v001/',
    ]);
    expect(requestedParams).toEqual([
      {
        appid: null,
        date: '2026-07-01',
        highwatermark_id: '0',
      },
      {
        appid: '480',
        date: '20260701',
        highwatermark_id: null,
      },
    ]);
  });

  it('requires a financial key before making requests', async () => {
    let requestCount = 0;
    const client = createPartnerFinancialsClient(async () => {
      requestCount += 1;
      return {};
    });

    await expect(
      client.getChangedDatesForPartner({
        highWatermark: '0',
      }),
    ).rejects.toMatchObject({
      code: 'authorization_required',
    });
    expect(requestCount).toBe(0);
  });
});
