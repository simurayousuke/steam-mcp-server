import { describe, expect, it } from 'vitest';

import { SteamPlayerClient } from '../src/steam/player-client.js';

describe('SteamPlayerClient', () => {
  it('injects the configured Web API key and requested SteamID', async () => {
    let requestedUrl: URL | undefined;
    const client = new SteamPlayerClient({
      webApiKey: 'configured-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url: URL) => {
          requestedUrl = url;
          return {
            response: {
              players: [],
            },
          };
        },
      },
    });

    await client.getPlayerSummary({
      steamId: '76561197960434622',
    });

    expect(requestedUrl?.origin).toBe('https://api.steampowered.com');
    expect(requestedUrl?.pathname).toBe('/ISteamUser/GetPlayerSummaries/v2/');
    expect(requestedUrl?.searchParams.get('key')).toBe('configured-key');
    expect(requestedUrl?.searchParams.get('steamids')).toBe('76561197960434622');
  });

  it('requires STEAM_WEB_API_KEY before making requests', async () => {
    let requestCount = 0;
    const client = new SteamPlayerClient({
      cacheTtlMs: 60_000,
      http: {
        getJson: async () => {
          requestCount += 1;
          return {};
        },
      },
    });

    await expect(
      client.getOwnedGames({
        steamId: '76561197960434622',
      }),
    ).rejects.toMatchObject({
      code: 'authentication_required',
    });
    expect(requestCount).toBe(0);
  });

  it('caches identical player API calls', async () => {
    let requestCount = 0;
    const client = new SteamPlayerClient({
      webApiKey: 'configured-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async () => {
          requestCount += 1;
          return {
            response: {
              game_count: 0,
            },
          };
        },
      },
    });

    const first = await client.getOwnedGames({
      steamId: '76561197960434622',
    });
    const second = await client.getOwnedGames({
      steamId: '76561197960434622',
    });

    expect(first.request).toMatchObject({
      cache: 'miss',
    });
    expect(second.request).toMatchObject({
      cache: 'hit',
    });
    expect(requestCount).toBe(1);
  });
});
