import { describe, expect, it } from 'vitest';

import { SteamUserOAuthClient } from '../src/steam/user-oauth-client.js';

function createUserOAuthClient(
  getJson: (url: URL) => Promise<unknown>,
  options: {
    oauthAccessToken?: string | (() => string | undefined);
  } = {},
): SteamUserOAuthClient {
  return new SteamUserOAuthClient({
    http: {
      getJson,
    },
    oauthAccessToken: options.oauthAccessToken,
    cacheTtlMs: 60_000,
  });
}

describe('SteamUserOAuthClient', () => {
  it('fetches token details with a session OAuth access token', async () => {
    let requestedUrl: URL | undefined;
    const client = createUserOAuthClient(
      async (url) => {
        requestedUrl = url;
        return {
          success: 1,
          steamid: '76561197960434622',
        };
      },
      {
        oauthAccessToken: 'oauth-token',
      },
    );

    await expect(client.getTokenDetails()).resolves.toMatchObject({
      response: {
        success: 1,
        steamid: '76561197960434622',
      },
    });
    expect(requestedUrl?.pathname).toBe('/ISteamUserOAuth/GetTokenDetails/v1/');
    expect(requestedUrl?.searchParams.get('access_token')).toBe('oauth-token');
  });

  it('requires an OAuth access token before making requests', async () => {
    let requestCount = 0;
    const client = createUserOAuthClient(async () => {
      requestCount += 1;
      return {};
    });

    await expect(client.getTokenDetails()).rejects.toMatchObject({
      code: 'authentication_required',
    });
    expect(requestCount).toBe(0);
  });
});
