import { describe, expect, it } from 'vitest';

import { SteamGameNotificationsClient } from '../src/steam/game-notifications-client.js';

function createGameNotificationsClient(
  getJson: (url: URL) => Promise<unknown>,
  options: {
    publisherKey?: string | (() => string | undefined);
  } = {},
): SteamGameNotificationsClient {
  return new SteamGameNotificationsClient({
    http: {
      getJson,
    },
    publisherKey: options.publisherKey,
    cacheTtlMs: 60_000,
  });
}

describe('SteamGameNotificationsClient', () => {
  it('enumerates game notification sessions using input_json', async () => {
    let requestedUrl: URL | undefined;
    const client = createGameNotificationsClient(
      async (url) => {
        requestedUrl = url;
        return {
          response: [],
        };
      },
      {
        publisherKey: 'publisher-key',
      },
    );

    await client.enumerateSessionsForApp({
      steamId: '76561197960434622',
      appid: 480,
      includeAllUserMessages: true,
      includeAuthUserMessage: false,
      language: 'en',
    });

    expect(requestedUrl?.origin).toBe('https://partner.steam-api.com');
    expect(requestedUrl?.pathname).toBe('/IGameNotificationsService/EnumerateSessionsForApp/v1/');
    expect(requestedUrl?.searchParams.get('format')).toBe('json');
    expect(requestedUrl?.searchParams.get('key')).toBe('publisher-key');
    expect(JSON.parse(requestedUrl?.searchParams.get('input_json') ?? '{}')).toEqual({
      steamid: '76561197960434622',
      appid: 480,
      include_all_user_messages: true,
      include_auth_user_message: false,
      language: 'en',
    });
  });

  it('fetches game notification session details', async () => {
    let requestedUrl: URL | undefined;
    const client = createGameNotificationsClient(
      async (url) => {
        requestedUrl = url;
        return {
          response: [],
        };
      },
      {
        publisherKey: 'publisher-key',
      },
    );

    await client.getSessionDetailsForApp({
      appid: 480,
      sessionIds: [' 12 ', '13'],
      includeAllUserMessages: true,
      language: 'ja',
    });

    expect(requestedUrl?.pathname).toBe('/IGameNotificationsService/GetSessionDetailsForApp/v1/');
    expect(JSON.parse(requestedUrl?.searchParams.get('input_json') ?? '{}')).toEqual({
      appid: 480,
      language: 'ja',
      sessions: [
        {
          sessionid: '12',
          include_all_user_messages: true,
        },
        {
          sessionid: '13',
          include_all_user_messages: true,
        },
      ],
    });
  });

  it('requires a publisher key before making requests', async () => {
    let requestCount = 0;
    const client = createGameNotificationsClient(async () => {
      requestCount += 1;
      return {};
    });

    await expect(
      client.enumerateSessionsForApp({
        steamId: '76561197960434622',
      }),
    ).rejects.toMatchObject({
      code: 'authorization_required',
    });
    expect(requestCount).toBe(0);
  });
});
