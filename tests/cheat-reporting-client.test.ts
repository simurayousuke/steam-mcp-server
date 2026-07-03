import { describe, expect, it } from 'vitest';

import { SteamCheatReportingClient } from '../src/steam/cheat-reporting-client.js';

function createCheatReportingClient(
  getJson: (url: URL) => Promise<unknown>,
  options: {
    publisherKey?: string | (() => string | undefined);
  } = {},
): SteamCheatReportingClient {
  return new SteamCheatReportingClient({
    http: {
      getJson,
    },
    publisherKey: options.publisherKey,
    cacheTtlMs: 60_000,
  });
}

describe('SteamCheatReportingClient', () => {
  it('gets cheating reports with input_json and publisher key', async () => {
    let requestedUrl: URL | undefined;
    const client = createCheatReportingClient(
      async (url) => {
        requestedUrl = url;
        return {
          response: {
            reports: [],
          },
        };
      },
      {
        publisherKey: 'publisher-key',
      },
    );

    await client.getCheatingReports({
      appid: 480,
      timeBegin: 1_788_192_000,
      timeEnd: 1_788_278_400,
      reportIdMin: '0',
      includeReports: true,
      includeBans: false,
      steamId: '76561197960434622',
    });

    expect(requestedUrl?.origin).toBe('https://partner.steam-api.com');
    expect(requestedUrl?.pathname).toBe('/ICheatReportingService/GetCheatingReports/v1/');
    expect(requestedUrl?.searchParams.get('format')).toBe('json');
    expect(requestedUrl?.searchParams.get('key')).toBe('publisher-key');
    expect(JSON.parse(requestedUrl?.searchParams.get('input_json') ?? '{}')).toEqual({
      appid: 480,
      timebegin: 1_788_192_000,
      timeend: 1_788_278_400,
      reportidmin: '0',
      includereports: true,
      includebans: false,
      steamid: '76561197960434622',
    });
  });

  it('defaults to including reports and bans', async () => {
    let inputJson: Record<string, unknown> | undefined;
    const client = createCheatReportingClient(
      async (url) => {
        inputJson = JSON.parse(url.searchParams.get('input_json') ?? '{}');
        return {
          response: {},
        };
      },
      {
        publisherKey: 'publisher-key',
      },
    );

    await client.getCheatingReports({
      appid: 480,
      timeBegin: 1,
      timeEnd: 2,
      reportIdMin: '0',
    });

    expect(inputJson).toMatchObject({
      includereports: true,
      includebans: true,
    });
  });

  it('requires at least one result type before making requests', async () => {
    let requestCount = 0;
    const client = createCheatReportingClient(
      async () => {
        requestCount += 1;
        return {};
      },
      {
        publisherKey: 'publisher-key',
      },
    );

    await expect(
      client.getCheatingReports({
        appid: 480,
        timeBegin: 1,
        timeEnd: 2,
        reportIdMin: '0',
        includeReports: false,
        includeBans: false,
      }),
    ).rejects.toMatchObject({
      code: 'validation_error',
    });
    expect(requestCount).toBe(0);
  });

  it('requires a publisher key before making requests', async () => {
    let requestCount = 0;
    const client = createCheatReportingClient(async () => {
      requestCount += 1;
      return {};
    });

    await expect(
      client.getCheatingReports({
        appid: 480,
        timeBegin: 1,
        timeEnd: 2,
        reportIdMin: '0',
      }),
    ).rejects.toMatchObject({
      code: 'authorization_required',
    });
    expect(requestCount).toBe(0);
  });
});
