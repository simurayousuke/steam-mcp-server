import { describe, expect, it } from 'vitest';

import { SteamGameServersClient } from '../src/steam/game-servers-client.js';

function createGameServersClient(
  getJson: (url: URL) => Promise<unknown>,
  options: {
    webApiKey?: string | (() => string | undefined);
  } = {},
): SteamGameServersClient {
  return new SteamGameServersClient({
    http: {
      getJson,
    },
    webApiKey: options.webApiKey,
    cacheTtlMs: 60_000,
  });
}

describe('SteamGameServersClient', () => {
  it('fetches game server account public info using input_json', async () => {
    let requestedUrl: URL | undefined;
    const client = createGameServersClient(
      async (url) => {
        requestedUrl = url;
        return {
          response: {
            steamid: '90000000000000000',
          },
        };
      },
      {
        webApiKey: 'configured-key',
      },
    );

    await expect(
      client.getAccountPublicInfo({
        steamId: '90000000000000000',
      }),
    ).resolves.toMatchObject({
      query: {
        steamId: '90000000000000000',
      },
      response: {
        response: {
          steamid: '90000000000000000',
        },
      },
    });

    expect(requestedUrl?.origin).toBe('https://api.steampowered.com');
    expect(requestedUrl?.pathname).toBe('/IGameServersService/GetAccountPublicInfo/v1/');
    expect(requestedUrl?.searchParams.get('format')).toBe('json');
    expect(requestedUrl?.searchParams.get('key')).toBe('configured-key');
    expect(JSON.parse(requestedUrl?.searchParams.get('input_json') ?? '{}')).toEqual({
      steamid: '90000000000000000',
    });
  });

  it('fetches server SteamIDs by comma-separated IP values', async () => {
    let requestedUrl: URL | undefined;
    const client = createGameServersClient(
      async (url) => {
        requestedUrl = url;
        return {
          response: {
            servers: [],
          },
        };
      },
      {
        webApiKey: 'configured-key',
      },
    );

    await expect(
      client.getServerSteamIdsByIp({
        serverIps: [' 203.0.113.10:27015 ', '203.0.113.11:27015'],
      }),
    ).resolves.toMatchObject({
      query: {
        serverIps: ['203.0.113.10:27015', '203.0.113.11:27015'],
      },
    });

    expect(requestedUrl?.pathname).toBe('/IGameServersService/GetServerSteamIDsByIP/v1/');
    expect(JSON.parse(requestedUrl?.searchParams.get('input_json') ?? '{}')).toEqual({
      server_ips: '203.0.113.10:27015,203.0.113.11:27015',
    });
  });

  it('fetches server IPs by comma-separated SteamIDs', async () => {
    let requestedUrl: URL | undefined;
    const client = createGameServersClient(
      async (url) => {
        requestedUrl = url;
        return {
          response: {
            servers: [],
          },
        };
      },
      {
        webApiKey: 'configured-key',
      },
    );

    await expect(
      client.getServerIpsBySteamId({
        serverSteamIds: ['90000000000000000', '90000000000000001'],
      }),
    ).resolves.toMatchObject({
      query: {
        serverSteamIds: ['90000000000000000', '90000000000000001'],
      },
    });

    expect(requestedUrl?.pathname).toBe('/IGameServersService/GetServerIPsBySteamID/v1/');
    expect(JSON.parse(requestedUrl?.searchParams.get('input_json') ?? '{}')).toEqual({
      server_steamids: '90000000000000000,90000000000000001',
    });
  });

  it('requires a Web API key before making requests', async () => {
    let requestCount = 0;
    const client = createGameServersClient(async () => {
      requestCount += 1;
      return {};
    });

    await expect(
      client.getAccountPublicInfo({
        steamId: '90000000000000000',
      }),
    ).rejects.toMatchObject({
      code: 'authentication_required',
    });
    expect(requestCount).toBe(0);
  });
});
