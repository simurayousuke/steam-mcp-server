import { describe, expect, it } from 'vitest';

import { SteamPublisherClient } from '../src/steam/publisher-client.js';

describe('SteamPublisherClient', () => {
  it('injects the configured publisher key and app ownership parameters', async () => {
    let requestedUrl: URL | undefined;
    const client = new SteamPublisherClient({
      publisherKey: 'publisher-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url) => {
          requestedUrl = url;
          return {
            appownership: {},
          };
        },
      },
    });

    await client.checkAppOwnership({
      steamId: '76561197960434622',
      appid: 620,
    });

    expect(requestedUrl?.origin).toBe('https://partner.steam-api.com');
    expect(requestedUrl?.pathname).toBe('/ISteamUser/CheckAppOwnership/v4/');
    expect(requestedUrl?.searchParams.get('key')).toBe('publisher-key');
    expect(requestedUrl?.searchParams.get('steamid')).toBe('76561197960434622');
    expect(requestedUrl?.searchParams.get('appid')).toBe('620');
  });

  it('calls publisher read endpoints with expected parameters', async () => {
    const requestedPaths: string[] = [];
    const requestedParams: Record<string, string | null>[] = [];
    const client = new SteamPublisherClient({
      publisherKey: 'publisher-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url) => {
          requestedPaths.push(url.pathname);
          requestedParams.push({
            appids: url.searchParams.get('appids'),
            rowversion: url.searchParams.get('rowversion'),
            steamid: url.searchParams.get('steamid'),
          });
          return {
            response: {},
          };
        },
      },
    });

    await client.getPublisherAppOwnership({
      steamId: '76561197960434622',
    });
    await client.getAppPriceInfo({
      steamId: '76561197960434622',
      appids: [620, 400],
    });
    await client.getDeletedSteamIds({
      rowVersion: '0',
    });
    await client.getUserGroupList({
      steamId: '76561197960434622',
    });

    expect(requestedPaths).toEqual([
      '/ISteamUser/GetPublisherAppOwnership/v4/',
      '/ISteamUser/GetAppPriceInfo/v1/',
      '/ISteamUser/GetDeletedSteamIDs/v1/',
      '/ISteamUser/GetUserGroupList/v1/',
    ]);
    expect(requestedParams).toEqual([
      {
        appids: null,
        rowversion: null,
        steamid: '76561197960434622',
      },
      {
        appids: '620,400',
        rowversion: null,
        steamid: '76561197960434622',
      },
      {
        appids: null,
        rowversion: '0',
        steamid: null,
      },
      {
        appids: null,
        rowversion: null,
        steamid: '76561197960434622',
      },
    ]);
  });

  it('authenticates Steam user tickets with publisher credentials', async () => {
    let requestedUrl: URL | undefined;
    const client = new SteamPublisherClient({
      publisherKey: 'publisher-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url) => {
          requestedUrl = url;
          return {
            response: {
              params: {
                steamid: '76561197960434622',
              },
            },
          };
        },
      },
    });

    await client.authenticateUserTicket({
      appid: 620,
      ticket: '00ff',
      identity: 'mcp-server',
    });

    expect(requestedUrl?.origin).toBe('https://partner.steam-api.com');
    expect(requestedUrl?.pathname).toBe('/ISteamUserAuth/AuthenticateUserTicket/v1/');
    expect(requestedUrl?.searchParams.get('appid')).toBe('620');
    expect(requestedUrl?.searchParams.get('ticket')).toBe('00ff');
    expect(requestedUrl?.searchParams.get('identity')).toBe('mcp-server');
    expect(requestedUrl?.searchParams.get('key')).toBe('publisher-key');
  });

  it('requires STEAM_PUBLISHER_KEY before making requests', async () => {
    let requestCount = 0;
    const client = new SteamPublisherClient({
      cacheTtlMs: 60_000,
      http: {
        getJson: async () => {
          requestCount += 1;
          return {};
        },
      },
    });

    await expect(
      client.checkAppOwnership({
        steamId: '76561197960434622',
        appid: 620,
      }),
    ).rejects.toMatchObject({
      code: 'authorization_required',
    });
    expect(requestCount).toBe(0);
  });
});
