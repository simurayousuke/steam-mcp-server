import { describe, expect, it } from 'vitest';

import { SteamLobbyMatchmakingClient } from '../src/steam/lobby-matchmaking-client.js';

function createLobbyClient(
  getJson: (url: URL) => Promise<unknown>,
  options: {
    publisherKey?: string | (() => string | undefined);
  } = {},
): SteamLobbyMatchmakingClient {
  return new SteamLobbyMatchmakingClient({
    http: {
      getJson,
    },
    publisherKey: options.publisherKey,
    cacheTtlMs: 60_000,
  });
}

describe('SteamLobbyMatchmakingClient', () => {
  it('fetches lobby data using input_json', async () => {
    let requestedUrl: URL | undefined;
    const client = createLobbyClient(
      async (url) => {
        requestedUrl = url;
        return {
          response: {
            members: [],
          },
        };
      },
      {
        publisherKey: 'publisher-key',
      },
    );

    await client.getLobbyData({
      appid: 480,
      steamIdLobby: '109775241076241661',
    });

    expect(requestedUrl?.origin).toBe('https://partner.steam-api.com');
    expect(requestedUrl?.pathname).toBe('/ILobbyMatchmakingService/GetLobbyData/v1/');
    expect(requestedUrl?.searchParams.get('key')).toBe('publisher-key');
    expect(JSON.parse(requestedUrl?.searchParams.get('input_json') ?? '{}')).toEqual({
      appid: 480,
      steamid_lobby: '109775241076241661',
    });
  });

  it('requires a publisher key before making requests', async () => {
    let requestCount = 0;
    const client = createLobbyClient(async () => {
      requestCount += 1;
      return {};
    });

    await expect(
      client.getLobbyData({
        appid: 480,
        steamIdLobby: '109775241076241661',
      }),
    ).rejects.toMatchObject({
      code: 'authorization_required',
    });
    expect(requestCount).toBe(0);
  });
});
