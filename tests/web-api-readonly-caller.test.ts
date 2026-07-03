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
});
