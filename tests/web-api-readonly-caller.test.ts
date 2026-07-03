import { describe, expect, it } from 'vitest';

import type { SteamWebApiMethodSchema } from '../src/catalog/steam-web-api-catalog.js';
import { SteamWebApiReadonlyCaller } from '../src/steam/web-api-readonly-caller.js';

const getNewsMethod: SteamWebApiMethodSchema = {
  interfaceName: 'ISteamNews',
  name: 'GetNewsForApp',
  version: 2,
  httpMethod: 'GET',
  parameters: [
    {
      name: 'appid',
      type: 'uint32',
      optional: false,
    },
  ],
};

describe('SteamWebApiReadonlyCaller', () => {
  it('calls safe GET methods with validated parameters', async () => {
    let requestedUrl: URL | undefined;
    const caller = new SteamWebApiReadonlyCaller({
      catalogClient: {
        getMethodSchema: async () => getNewsMethod,
      } as never,
      http: {
        getJson: async (url: URL) => {
          requestedUrl = url;
          return {
            appnews: {
              appid: 10,
            },
          };
        },
      },
    });

    const result = await caller.call({
      interfaceName: 'ISteamNews',
      methodName: 'GetNewsForApp',
      params: {
        appid: 10,
      },
    });

    expect(result.response).toEqual({
      appnews: {
        appid: 10,
      },
    });
    expect(requestedUrl?.toString()).toBe('https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?format=json&appid=10');
  });

  it('rejects dangerous methods before making HTTP requests', async () => {
    let requestCount = 0;
    const caller = new SteamWebApiReadonlyCaller({
      catalogClient: {
        getMethodSchema: async () => ({
          ...getNewsMethod,
          name: 'DeleteSomething',
        }),
      } as never,
      http: {
        getJson: async () => {
          requestCount += 1;
          return {};
        },
      },
    });

    await expect(
      caller.call({
        interfaceName: 'Unsafe',
        methodName: 'DeleteSomething',
      }),
    ).rejects.toMatchObject({
      code: 'unsafe_method_blocked',
    });
    expect(requestCount).toBe(0);
  });

  it('rejects secret parameters supplied as arguments', async () => {
    const caller = new SteamWebApiReadonlyCaller({
      catalogClient: {
        getMethodSchema: async () => ({
          ...getNewsMethod,
          parameters: [
            {
              name: 'key',
              optional: true,
            },
          ],
        }),
      } as never,
      http: {
        getJson: async () => ({}),
      },
    });

    await expect(
      caller.call({
        interfaceName: 'ISteamNews',
        methodName: 'GetNewsForApp',
        params: {
          key: 'do-not-pass-secrets-here',
        },
      }),
    ).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('injects the session OAuth token for access_token catalog parameters', async () => {
    let requestedUrl: URL | undefined;
    const caller = new SteamWebApiReadonlyCaller({
      catalogClient: {
        getMethodSchema: async () => ({
          interfaceName: 'ISteamUserOAuth',
          name: 'GetTokenDetails',
          version: 1,
          httpMethod: 'GET',
          parameters: [
            {
              name: 'access_token',
              optional: false,
            },
          ],
        }),
      } as never,
      oauthAccessToken: () => 'oauth-token',
      http: {
        getJson: async (url: URL) => {
          requestedUrl = url;
          return {
            response: {
              steamid: '76561197960434622',
            },
          };
        },
      },
    });

    const result = await caller.call({
      interfaceName: 'ISteamUserOAuth',
      methodName: 'GetTokenDetails',
    });

    expect(result.request.parameterNames).toContain('access_token');
    expect(requestedUrl?.pathname).toBe('/ISteamUserOAuth/GetTokenDetails/v1/');
    expect(requestedUrl?.searchParams.get('access_token')).toBe('oauth-token');
  });

  it('requires a session OAuth token for required access_token parameters', async () => {
    const caller = new SteamWebApiReadonlyCaller({
      catalogClient: {
        getMethodSchema: async () => ({
          interfaceName: 'ISteamUserOAuth',
          name: 'GetTokenDetails',
          version: 1,
          httpMethod: 'GET',
          parameters: [
            {
              name: 'access_token',
              optional: false,
            },
          ],
        }),
      } as never,
      http: {
        getJson: async () => ({}),
      },
    });

    await expect(
      caller.call({
        interfaceName: 'ISteamUserOAuth',
        methodName: 'GetTokenDetails',
      }),
    ).rejects.toMatchObject({
      code: 'authentication_required',
    });
  });

  it('allows explicitly allowlisted POST methods', async () => {
    let submittedForm: URLSearchParams | undefined;
    const caller = new SteamWebApiReadonlyCaller({
      catalogClient: {
        getMethodSchema: async () => ({
          interfaceName: 'ISteamRemoteStorage',
          name: 'GetPublishedFileDetails',
          version: 1,
          httpMethod: 'POST',
          parameters: [
            {
              name: 'itemcount',
              optional: false,
            },
            {
              name: 'publishedfileids[0]',
              optional: false,
            },
          ],
        }),
      } as never,
      allowlistedMethods: new Set(['isteamremotestorage.getpublishedfiledetails.v1']),
      http: {
        getJson: async () => {
          throw new Error('GET should not be used for allowlisted POST methods.');
        },
        postFormJson: async (_url, form) => {
          submittedForm = form;
          return {
            response: {
              result: 1,
            },
          };
        },
      },
    });

    const result = await caller.call({
      interfaceName: 'ISteamRemoteStorage',
      methodName: 'GetPublishedFileDetails',
      params: {
        itemcount: 1,
        'publishedfileids[0]': '848618186',
      },
    });

    expect(result.request).toMatchObject({
      httpMethod: 'POST',
      allowlisted: true,
    });
    expect(submittedForm?.get('itemcount')).toBe('1');
    expect(submittedForm?.get('publishedfileids[0]')).toBe('848618186');
  });
});
