import { describe, expect, it } from 'vitest';

import { SteamSiteLicenseClient } from '../src/steam/site-license-client.js';

function createSiteLicenseClient(
  getJson: (url: URL) => Promise<unknown>,
  options: {
    publisherKey?: string | (() => string | undefined);
  } = {},
): SteamSiteLicenseClient {
  return new SteamSiteLicenseClient({
    http: {
      getJson,
    },
    publisherKey: options.publisherKey,
    cacheTtlMs: 60_000,
  });
}

describe('SteamSiteLicenseClient', () => {
  it('fetches current client connections', async () => {
    let requestedUrl: URL | undefined;
    const client = createSiteLicenseClient(
      async (url) => {
        requestedUrl = url;
        return {
          sites: [],
        };
      },
      {
        publisherKey: 'publisher-key',
      },
    );

    await client.getCurrentClientConnections({
      siteId: '0',
    });

    expect(requestedUrl?.origin).toBe('https://api.steampowered.com');
    expect(requestedUrl?.pathname).toBe('/ISiteLicenseService/GetCurrentClientConnections/v1/');
    expect(requestedUrl?.searchParams.get('key')).toBe('publisher-key');
    expect(requestedUrl?.searchParams.get('siteid')).toBe('0');
  });

  it('fetches total playtime', async () => {
    let requestedUrl: URL | undefined;
    const client = createSiteLicenseClient(
      async (url) => {
        requestedUrl = url;
        return {
          sites: [],
        };
      },
      {
        publisherKey: 'publisher-key',
      },
    );

    await client.getTotalPlaytime({
      startTime: '2026-07-01T00:00:00Z',
      endTime: '2026-07-02T00:00:00Z',
      siteId: '123',
    });

    expect(requestedUrl?.pathname).toBe('/ISiteLicenseService/GetTotalPlaytime/v1/');
    expect(requestedUrl?.searchParams.get('start_time')).toBe('2026-07-01T00:00:00Z');
    expect(requestedUrl?.searchParams.get('end_time')).toBe('2026-07-02T00:00:00Z');
    expect(requestedUrl?.searchParams.get('siteid')).toBe('123');
  });

  it('requires a publisher key before making requests', async () => {
    let requestCount = 0;
    const client = createSiteLicenseClient(async () => {
      requestCount += 1;
      return {};
    });

    await expect(client.getCurrentClientConnections({})).rejects.toMatchObject({
      code: 'authorization_required',
    });
    expect(requestCount).toBe(0);
  });
});
