import { describe, expect, it } from 'vitest';

import { SteamWebApiCatalogClient } from '../src/catalog/steam-web-api-catalog.js';
import { SteamMcpError } from '../src/common/errors.js';

const catalogFixture = {
  apilist: {
    interfaces: [
      {
        name: 'IPlayerService',
        methods: [
          {
            name: 'GetOwnedGames',
            version: 1,
            httpmethod: 'GET',
            parameters: [
              {
                name: 'key',
                type: 'string',
                optional: false,
                description: 'Steam Web API publisher authentication key.',
              },
              {
                name: 'steamid',
                type: 'uint64',
                optional: false,
                description: 'SteamID of account.',
              },
              {
                name: 'include_appinfo',
                type: 'bool',
                optional: true,
              },
            ],
          },
        ],
      },
    ],
  },
};

describe('SteamWebApiCatalogClient', () => {
  it('normalizes interface and method summaries', async () => {
    const client = new SteamWebApiCatalogClient({
      http: {
        getJson: async () => catalogFixture,
      },
      cacheTtlMs: 60_000,
    });

    await expect(client.listInterfaces()).resolves.toEqual([
      {
        name: 'IPlayerService',
        methodCount: 1,
        methods: ['GetOwnedGames/v1'],
      },
    ]);

    await expect(client.listMethods({ interfaceName: 'iplayerService' })).resolves.toEqual([
      {
        interfaceName: 'IPlayerService',
        name: 'GetOwnedGames',
        version: 1,
        httpMethod: 'GET',
        parameterCount: 3,
        requiredParameters: ['key', 'steamid'],
        optionalParameters: ['include_appinfo'],
      },
    ]);
  });

  it('returns not_found for unknown interfaces', async () => {
    const client = new SteamWebApiCatalogClient({
      http: {
        getJson: async () => catalogFixture,
      },
      cacheTtlMs: 60_000,
    });

    await expect(client.listMethods({ interfaceName: 'MissingInterface' })).rejects.toMatchObject({
      code: 'not_found',
    } satisfies Partial<SteamMcpError>);
  });

  it('uses the cache until refresh is requested', async () => {
    let requestCount = 0;
    const client = new SteamWebApiCatalogClient({
      http: {
        getJson: async () => {
          requestCount += 1;
          return catalogFixture;
        },
      },
      cacheTtlMs: 60_000,
    });

    await client.getCatalog();
    await client.getCatalog();
    await client.getCatalog({ refresh: true });

    expect(requestCount).toBe(2);
  });
});
