import { describe, expect, it } from 'vitest';

import { SteamEconServiceClient } from '../src/steam/econ-service-client.js';

function createEconServiceClient(
  getJson: (url: URL) => Promise<unknown>,
  options: {
    webApiKey?: string | (() => string | undefined);
  } = {},
): SteamEconServiceClient {
  return new SteamEconServiceClient({
    http: {
      getJson,
    },
    webApiKey: options.webApiKey,
    cacheTtlMs: 60_000,
  });
}

describe('SteamEconServiceClient', () => {
  it('fetches trade history with expected parameters', async () => {
    let requestedUrl: URL | undefined;
    const client = createEconServiceClient(
      async (url) => {
        requestedUrl = url;
        return {
          response: {
            trades: [],
          },
        };
      },
      {
        webApiKey: 'configured-key',
      },
    );

    await client.getTradeHistory({
      maxTrades: 50,
      startAfterTime: 1000,
      startAfterTradeId: '123',
      navigatingBack: false,
      getDescriptions: true,
      language: 'en',
      includeFailed: true,
      includeTotal: true,
    });

    expect(requestedUrl?.origin).toBe('https://api.steampowered.com');
    expect(requestedUrl?.pathname).toBe('/IEconService/GetTradeHistory/v1/');
    expect(requestedUrl?.searchParams.get('key')).toBe('configured-key');
    expect(requestedUrl?.searchParams.get('max_trades')).toBe('50');
    expect(requestedUrl?.searchParams.get('start_after_time')).toBe('1000');
    expect(requestedUrl?.searchParams.get('start_after_tradeid')).toBe('123');
    expect(requestedUrl?.searchParams.get('navigating_back')).toBe('false');
    expect(requestedUrl?.searchParams.get('get_descriptions')).toBe('true');
    expect(requestedUrl?.searchParams.get('language')).toBe('en');
    expect(requestedUrl?.searchParams.get('include_failed')).toBe('true');
    expect(requestedUrl?.searchParams.get('include_total')).toBe('true');
  });

  it('fetches trade offers, a single offer, and summary', async () => {
    const requestedPaths: string[] = [];
    const requestedParams: Record<string, string | null>[] = [];
    const client = createEconServiceClient(
      async (url) => {
        requestedPaths.push(url.pathname);
        requestedParams.push({
          get_sent_offers: url.searchParams.get('get_sent_offers'),
          get_received_offers: url.searchParams.get('get_received_offers'),
          tradeofferid: url.searchParams.get('tradeofferid'),
          time_last_visit: url.searchParams.get('time_last_visit'),
        });
        return {
          response: {},
        };
      },
      {
        webApiKey: 'configured-key',
      },
    );

    await client.getTradeOffers({
      getSentOffers: true,
      getReceivedOffers: true,
    });
    await client.getTradeOffer({
      tradeOfferId: '456',
    });
    await client.getTradeOffersSummary({
      timeLastVisit: 2000,
    });

    expect(requestedPaths).toEqual([
      '/IEconService/GetTradeOffers/v1/',
      '/IEconService/GetTradeOffer/v1/',
      '/IEconService/GetTradeOffersSummary/v1/',
    ]);
    expect(requestedParams).toEqual([
      {
        get_sent_offers: 'true',
        get_received_offers: 'true',
        tradeofferid: null,
        time_last_visit: null,
      },
      {
        get_sent_offers: null,
        get_received_offers: null,
        tradeofferid: '456',
        time_last_visit: null,
      },
      {
        get_sent_offers: null,
        get_received_offers: null,
        tradeofferid: null,
        time_last_visit: '2000',
      },
    ]);
  });

  it('requires a Web API key before making requests', async () => {
    let requestCount = 0;
    const client = createEconServiceClient(async () => {
      requestCount += 1;
      return {};
    });

    await expect(client.getTradeOffersSummary({})).rejects.toMatchObject({
      code: 'authentication_required',
    });
    expect(requestCount).toBe(0);
  });
});
