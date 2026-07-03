import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it } from 'vitest';

import type { SteamWebApiMethodSchema } from '../src/catalog/steam-web-api-catalog.js';
import { buildCatalogCoverageSummary } from '../src/catalog/coverage-summary.js';
import { registerCatalogTools } from '../src/tools/catalog.js';

const methodSchemas: SteamWebApiMethodSchema[] = [
  {
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
  },
  {
    interfaceName: 'ISteamRemoteStorage',
    name: 'GetPublishedFileDetails',
    version: 1,
    httpMethod: 'POST',
    parameters: [
      {
        name: 'itemcount',
        type: 'uint32',
        optional: false,
      },
    ],
  },
  {
    interfaceName: 'ISteamUserStats',
    name: 'GetSchemaForGame',
    version: 2,
    httpMethod: 'GET',
    parameters: [
      {
        name: 'key',
        type: 'string',
        optional: false,
      },
      {
        name: 'appid',
        type: 'uint32',
        optional: false,
      },
    ],
  },
  {
    interfaceName: 'ISteamUserOAuth',
    name: 'GetTokenDetails',
    version: 1,
    httpMethod: 'GET',
    parameters: [
      {
        name: 'access_token',
        type: 'string',
        optional: false,
      },
    ],
  },
];

describe('Steam Web API catalog tools', () => {
  it('summarizes generic coverage by interface and default blocking reason', () => {
    const summary = buildCatalogCoverageSummary(
      {
        fetchedAt: '2026-07-03T00:00:00.000Z',
        interfaces: [
          {
            name: 'IAuthenticationService',
            methods: [
              {
                name: 'GetAuthSessionInfo',
                version: 1,
                httpMethod: 'GET',
                parameters: [],
              },
            ],
          },
          {
            name: 'ISteamNews',
            methods: [
              {
                name: 'GetNewsForApp',
                version: 2,
                httpMethod: 'GET',
                parameters: [
                  {
                    name: 'appid',
                    optional: false,
                  },
                ],
              },
              {
                name: 'SetNewsForApp',
                version: 1,
                httpMethod: 'POST',
                parameters: [],
              },
            ],
          },
          {
            name: 'ISteamRemoteStorage',
            methods: [
              {
                name: 'GetPublishedFileDetails',
                version: 1,
                httpMethod: 'POST',
                parameters: [
                  {
                    name: 'itemcount',
                    optional: false,
                  },
                ],
              },
            ],
          },
        ],
      },
      new Set(['isteamremotestorage.getpublishedfiledetails.v1']),
    );

    expect(summary).toMatchObject({
      interfaceCount: 3,
      methodCount: 4,
      defaultAllowedMethods: 1,
      allowlistedBlockedMethods: 1,
      blockedMethods: 2,
      postMethods: 2,
      configuredAllowlistCount: 1,
      interfaces: [
        {
          name: 'IAuthenticationService',
          methodCount: 1,
          defaultAllowedMethods: 0,
          blockedMethods: 1,
        },
        {
          name: 'ISteamNews',
          methodCount: 2,
          defaultAllowedMethods: 1,
          blockedMethods: 1,
          postMethods: 1,
        },
        {
          name: 'ISteamRemoteStorage',
          methodCount: 1,
          allowlistedBlockedMethods: 1,
          blockedMethods: 0,
          postMethods: 1,
        },
      ],
    });
    expect(summary.defaultBlockedReasonCounts).toEqual(
      expect.arrayContaining([
        {
          reason: 'HTTP method POST is not allowed by the default read-only policy.',
          count: 2,
        },
        {
          reason: 'Interface IAuthenticationService is blocked by the default policy because it handles Steam authentication flows.',
          count: 1,
        },
      ]),
    );
  });

  it('adds generic read-only access metadata to method listings and schemas', async () => {
    const server = new McpServer({
      name: 'steam-catalog-tool-test-server',
      version: '0.0.0',
    });
    const catalogClient = {
      getCatalog: async () => ({
        fetchedAt: '2026-07-03T00:00:00.000Z',
        interfaces: [],
      }),
      listMethods: async () =>
        methodSchemas.map((method) => ({
          interfaceName: method.interfaceName,
          name: method.name,
          version: method.version,
          httpMethod: method.httpMethod,
          parameterCount: method.parameters.length,
          requiredParameters: method.parameters.filter((parameter) => !parameter.optional).map((parameter) => parameter.name),
          optionalParameters: method.parameters.filter((parameter) => parameter.optional).map((parameter) => parameter.name),
        })),
      getMethodSchema: async ({
        methodName,
        version,
      }: {
        interfaceName: string;
        methodName: string;
        version?: number;
      }) => {
        const method = methodSchemas.find(
          (candidate) => candidate.name === methodName && (version === undefined || candidate.version === version),
        );

        if (!method) {
          throw new Error(`Unknown method ${methodName}.`);
        }

        return method;
      },
    };
    registerCatalogTools(
      server,
      catalogClient as never,
      {
        call: async () => ({
          request: {},
          response: {},
        }),
      } as never,
      new Set(['isteamremotestorage.getpublishedfiledetails.v1']),
    );
    const client = new Client({
      name: 'steam-catalog-tool-test-client',
      version: '0.0.0',
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    try {
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

      const listResult = await client.callTool({
        name: 'steam_api_list_methods',
        arguments: {
          interfaceName: 'ISteamNews',
        },
      });

      expect(listResult.structuredContent).toMatchObject({
        methods: [
          {
            name: 'GetNewsForApp',
            access: {
              defaultReadOnlyAllowed: true,
              callableByGenericReadOnlyTool: true,
              reservedServerParameters: ['format'],
              requiredUserParameters: ['appid'],
            },
          },
          {
            name: 'GetPublishedFileDetails',
            access: {
              defaultReadOnlyAllowed: false,
              allowlisted: true,
              callableByGenericReadOnlyTool: true,
            },
          },
          {
            name: 'GetSchemaForGame',
            access: {
              requiresWebApiKey: true,
              secretParameters: ['key'],
              requiredUserParameters: ['appid'],
            },
          },
          {
            name: 'GetTokenDetails',
            access: {
              requiresOAuthAccessToken: true,
              secretParameters: ['access_token'],
              requiredUserParameters: [],
            },
          },
        ],
      });

      const schemaResult = await client.callTool({
        name: 'steam_api_get_method_schema',
        arguments: {
          interfaceName: 'ISteamUserStats',
          methodName: 'GetSchemaForGame',
          version: 2,
        },
      });

      expect(schemaResult.structuredContent).toMatchObject({
        access: {
          methodIdentifier: 'isteamuserstats.getschemaforgame.v2',
          requiresWebApiKey: true,
          requiresOAuthAccessToken: false,
          secretParameters: ['key'],
          requiredUserParameters: ['appid'],
        },
      });
    } finally {
      await client.close();
      await server.close();
    }
  });
});
