import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it } from 'vitest';

import type { SteamWebApiMethodSchema } from '../src/catalog/steam-web-api-catalog.js';
import { registerSteamCatalogResources } from '../src/resources/catalog-resources.js';

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
];

describe('Steam Web API catalog resources', () => {
  it('exposes coverage, interface, method, and schema resources', async () => {
    const server = new McpServer({
      name: 'steam-catalog-resource-test-server',
      version: '0.0.0',
    });
    const catalogClient = {
      getCatalog: async () => ({
        fetchedAt: '2026-07-03T00:00:00.000Z',
        interfaces: [
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
      }),
      listInterfaces: async () => [
        {
          name: 'ISteamNews',
          methodCount: 1,
          methods: ['GetNewsForApp/v2'],
        },
        {
          name: 'ISteamRemoteStorage',
          methodCount: 1,
          methods: ['GetPublishedFileDetails/v1'],
        },
      ],
      listMethods: async ({ interfaceName }: { interfaceName: string }) =>
        methodSchemas
          .filter((method) => method.interfaceName === interfaceName)
          .map((method) => ({
            interfaceName: method.interfaceName,
            name: method.name,
            version: method.version,
            httpMethod: method.httpMethod,
            parameterCount: method.parameters.length,
            requiredParameters: method.parameters.filter((parameter) => !parameter.optional).map((parameter) => parameter.name),
            optionalParameters: method.parameters.filter((parameter) => parameter.optional).map((parameter) => parameter.name),
          })),
      getMethodSchema: async ({
        interfaceName,
        methodName,
        version,
      }: {
        interfaceName: string;
        methodName: string;
        version?: number;
      }) => {
        const method = methodSchemas.find(
          (candidate) =>
            candidate.interfaceName === interfaceName &&
            candidate.name === methodName &&
            (version === undefined || candidate.version === version),
        );

        if (!method) {
          throw new Error(`Unknown method ${interfaceName}.${methodName}.`);
        }

        return method;
      },
    };
    registerSteamCatalogResources(
      server,
      catalogClient,
      new Set(['isteamremotestorage.getpublishedfiledetails.v1']),
    );
    const client = new Client({
      name: 'steam-catalog-resource-test-client',
      version: '0.0.0',
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    try {
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

      const listedResources = await client.listResources();
      expect(listedResources.resources.map((resource) => resource.uri)).toEqual(
        expect.arrayContaining(['steam://api/coverage', 'steam://api/interfaces']),
      );

      const listedTemplates = await client.listResourceTemplates();
      expect(listedTemplates.resourceTemplates.map((resource) => resource.uriTemplate)).toEqual(
        expect.arrayContaining([
          'steam://api/interfaces/{interfaceName}/methods',
          'steam://api/interfaces/{interfaceName}/methods/{methodName}/versions/{version}',
        ]),
      );

      const coverage = await client.readResource({
        uri: 'steam://api/coverage',
      });
      expect(JSON.parse(coverage.contents[0]?.text ?? '{}')).toMatchObject({
        interfaceCount: 2,
        methodCount: 2,
        defaultAllowedMethods: 1,
        allowlistedBlockedMethods: 1,
        blockedMethods: 0,
      });

      const interfaces = await client.readResource({
        uri: 'steam://api/interfaces',
      });
      expect(JSON.parse(interfaces.contents[0]?.text ?? '{}')).toMatchObject({
        count: 2,
        interfaces: [
          {
            name: 'ISteamNews',
          },
          {
            name: 'ISteamRemoteStorage',
          },
        ],
      });

      const methods = await client.readResource({
        uri: 'steam://api/interfaces/ISteamRemoteStorage/methods',
      });
      expect(JSON.parse(methods.contents[0]?.text ?? '{}')).toMatchObject({
        interfaceName: 'ISteamRemoteStorage',
        methods: [
          {
            name: 'GetPublishedFileDetails',
            access: {
              defaultReadOnlyAllowed: false,
              allowlisted: true,
              callableByGenericReadOnlyTool: true,
              requiredUserParameters: ['itemcount'],
            },
          },
        ],
      });

      const schema = await client.readResource({
        uri: 'steam://api/interfaces/ISteamNews/methods/GetNewsForApp/versions/2',
      });
      expect(JSON.parse(schema.contents[0]?.text ?? '{}')).toMatchObject({
        interfaceName: 'ISteamNews',
        name: 'GetNewsForApp',
        version: 2,
        access: {
          methodIdentifier: 'isteamnews.getnewsforapp.v2',
          defaultReadOnlyAllowed: true,
          callableByGenericReadOnlyTool: true,
          requiredUserParameters: ['appid'],
        },
      });
    } finally {
      await client.close();
      await server.close();
    }
  });
});
