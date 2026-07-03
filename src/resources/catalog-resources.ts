import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

import { buildCatalogCoverageSummary, describeCatalogMethodAccess } from '../catalog/coverage-summary.js';
import type { SteamWebApiCatalogClient } from '../catalog/steam-web-api-catalog.js';

export type SteamCatalogResourceClient = Pick<
  SteamWebApiCatalogClient,
  'getCatalog' | 'listInterfaces' | 'listMethods' | 'getMethodSchema'
>;

export function registerSteamCatalogResources(
  server: McpServer,
  catalogClient: SteamCatalogResourceClient,
  allowlistedMethods: ReadonlySet<string> = new Set(),
): void {
  server.registerResource(
    'steam-api-coverage',
    'steam://api/coverage',
    {
      title: 'Steam Web API coverage',
      description: 'Current official Steam Web API catalog coverage and read-only safety summary as JSON.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const catalog = await catalogClient.getCatalog();

      return jsonResource(uri, buildCatalogCoverageSummary(catalog, allowlistedMethods));
    },
  );

  server.registerResource(
    'steam-api-interfaces',
    'steam://api/interfaces',
    {
      title: 'Steam Web API interfaces',
      description: 'Official Steam Web API interfaces discovered from ISteamWebAPIUtil/GetSupportedAPIList as JSON.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const interfaces = await catalogClient.listInterfaces();

      return jsonResource(uri, {
        interfaces,
        count: interfaces.length,
      });
    },
  );

  server.registerResource(
    'steam-api-interface-methods',
    new ResourceTemplate('steam://api/interfaces/{interfaceName}/methods', { list: undefined }),
    {
      title: 'Steam Web API interface methods',
      description: 'Methods for one official Steam Web API interface, including generic read-only access metadata.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const interfaceName = variableToString(variables.interfaceName);
      const methods = await catalogClient.listMethods({ interfaceName });
      const methodsWithAccess = await Promise.all(
        methods.map(async (method) => {
          const schema = await catalogClient.getMethodSchema({
            interfaceName: method.interfaceName,
            methodName: method.name,
            version: method.version,
          });

          return {
            ...method,
            access: describeCatalogMethodAccess(schema, allowlistedMethods),
          };
        }),
      );

      return jsonResource(uri, {
        interfaceName,
        methods: methodsWithAccess,
        count: methodsWithAccess.length,
      });
    },
  );

  server.registerResource(
    'steam-api-method-schema',
    new ResourceTemplate('steam://api/interfaces/{interfaceName}/methods/{methodName}/versions/{version}', {
      list: undefined,
    }),
    {
      title: 'Steam Web API method schema',
      description: 'Parameter schema and generic read-only access metadata for one official Steam Web API method.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const method = await catalogClient.getMethodSchema({
        interfaceName: variableToString(variables.interfaceName),
        methodName: variableToString(variables.methodName),
        version: parsePositiveInteger(variableToString(variables.version), 'version'),
      });

      return jsonResource(uri, {
        ...method,
        access: describeCatalogMethodAccess(method, allowlistedMethods),
      });
    },
  );
}

function jsonResource(uri: URL, data: unknown) {
  return {
    contents: [
      {
        uri: uri.toString(),
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function variableToString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function parsePositiveInteger(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isSafeInteger(parsed) || parsed <= 0 || String(parsed) !== value) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}
