import { describe, expect, it } from 'vitest';

import { SteamMicroTxnClient } from '../src/steam/microtxn-client.js';

function createMicroTxnClient(
  getJson: (url: URL) => Promise<unknown>,
  options: {
    publisherKey?: string | (() => string | undefined);
  } = {},
): SteamMicroTxnClient {
  return new SteamMicroTxnClient({
    http: {
      getJson,
    },
    publisherKey: options.publisherKey,
    cacheTtlMs: 60_000,
  });
}

describe('SteamMicroTxnClient', () => {
  it('fetches a microtransaction report with a publisher key', async () => {
    let requestedUrl: URL | undefined;
    const client = createMicroTxnClient(
      async (url) => {
        requestedUrl = url;
        return {
          response: {
            result: 'OK',
          },
        };
      },
      {
        publisherKey: 'publisher-key',
      },
    );

    await client.getReport({
      appid: 480,
      type: 'GAMESALES',
      time: '2026-07-01T00:00:00Z',
      maxResults: 1000,
    });

    expect(requestedUrl?.origin).toBe('https://partner.steam-api.com');
    expect(requestedUrl?.pathname).toBe('/ISteamMicroTxn/GetReport/v5/');
    expect(requestedUrl?.searchParams.get('format')).toBe('json');
    expect(requestedUrl?.searchParams.get('key')).toBe('publisher-key');
    expect(requestedUrl?.searchParams.get('appid')).toBe('480');
    expect(requestedUrl?.searchParams.get('type')).toBe('GAMESALES');
    expect(requestedUrl?.searchParams.get('time')).toBe('2026-07-01T00:00:00Z');
    expect(requestedUrl?.searchParams.get('maxresults')).toBe('1000');
  });

  it('uses sandbox paths for sandbox requests', async () => {
    const requestedPaths: string[] = [];
    const client = createMicroTxnClient(
      async (url) => {
        requestedPaths.push(url.pathname);
        return {
          response: {},
        };
      },
      {
        publisherKey: 'publisher-key',
      },
    );

    await client.getUserAgreementInfo({
      appid: 480,
      steamId: '76561197960434622',
      sandbox: true,
    });
    await client.getUserInfo({
      appid: 480,
      steamId: '76561197960434622',
      ipAddress: '127.0.0.1',
      sandbox: true,
    });
    await client.queryTxn({
      appid: 480,
      orderId: '123456',
      sandbox: true,
    });

    expect(requestedPaths).toEqual([
      '/ISteamMicroTxnSandbox/GetUserAgreementInfo/v2/',
      '/ISteamMicroTxnSandbox/GetUserInfo/v2/',
      '/ISteamMicroTxnSandbox/QueryTxn/v3/',
    ]);
  });

  it('queries transactions by order id or transaction id', async () => {
    const requestedParams: Record<string, string | null>[] = [];
    const client = createMicroTxnClient(
      async (url) => {
        requestedParams.push({
          orderid: url.searchParams.get('orderid'),
          transid: url.searchParams.get('transid'),
        });
        return {
          response: {},
        };
      },
      {
        publisherKey: 'publisher-key',
      },
    );

    await client.queryTxn({
      appid: 480,
      orderId: ' 123456 ',
    });
    await client.queryTxn({
      appid: 480,
      transId: '987654',
    });

    expect(requestedParams).toEqual([
      {
        orderid: '123456',
        transid: null,
      },
      {
        orderid: null,
        transid: '987654',
      },
    ]);
  });

  it('requires an order id or transaction id for transaction queries', async () => {
    const client = createMicroTxnClient(async () => ({}), {
      publisherKey: 'publisher-key',
    });

    await expect(
      client.queryTxn({
        appid: 480,
      }),
    ).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('requires a publisher key before making requests', async () => {
    let requestCount = 0;
    const client = createMicroTxnClient(async () => {
      requestCount += 1;
      return {};
    });

    await expect(
      client.getReport({
        appid: 480,
        time: '2026-07-01T00:00:00Z',
      }),
    ).rejects.toMatchObject({
      code: 'authorization_required',
    });
    expect(requestCount).toBe(0);
  });
});
