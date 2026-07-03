import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { buildCatalogCoverageSummary, describeCatalogMethodAccess } from '../catalog/coverage-summary.js';
import type { SteamWebApiCatalogClient } from '../catalog/steam-web-api-catalog.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamWebApiReadonlyCaller } from '../steam/web-api-readonly-caller.js';

const readonlyApiParameterValueSchema = z.union([z.string(), z.number(), z.boolean()]);

export function registerCatalogTools(
  server: McpServer,
  catalogClient: SteamWebApiCatalogClient,
  readonlyCaller: SteamWebApiReadonlyCaller,
  allowlistedMethods: ReadonlySet<string> = new Set(),
): void {
  server.registerTool(
    'steam_api_get_coverage_summary',
    {
      title: 'Get Steam Web API coverage summary',
      description: 'Summarize current Steam Web API catalog coverage and default read-only safety classification.',
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const catalog = await catalogClient.getCatalog();

        return toolSuccess({
          data: buildCatalogCoverageSummary(catalog, allowlistedMethods),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_api_refresh_catalog',
    {
      title: 'Refresh Steam Web API catalog',
      description: 'Fetch and cache the latest official Steam Web API method catalog.',
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const catalog = await catalogClient.getCatalog({ refresh: true });

        return toolSuccess({
          data: {
            fetchedAt: catalog.fetchedAt,
            interfaceCount: catalog.interfaces.length,
            methodCount: catalog.interfaces.reduce((total, apiInterface) => total + apiInterface.methods.length, 0),
          },
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_api_list_interfaces',
    {
      title: 'List Steam Web API interfaces',
      description: 'List official Steam Web API interfaces discovered from ISteamWebAPIUtil/GetSupportedAPIList.',
      inputSchema: {
        nameContains: z.string().min(1).optional(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const interfaces = await catalogClient.listInterfaces({
          nameContains: args.nameContains,
        });

        return toolSuccess({
          data: {
            interfaces,
            count: interfaces.length,
          },
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_api_list_methods',
    {
      title: 'List Steam Web API methods',
      description: 'List methods for one official Steam Web API interface.',
      inputSchema: {
        interfaceName: z.string().min(1),
        nameContains: z.string().min(1).optional(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const methods = await catalogClient.listMethods({
          interfaceName: args.interfaceName,
          nameContains: args.nameContains,
        });
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

        return toolSuccess({
          data: {
            interfaceName: args.interfaceName,
            methods: methodsWithAccess,
            count: methodsWithAccess.length,
          },
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_api_get_method_schema',
    {
      title: 'Get Steam Web API method schema',
      description: 'Return parameters and HTTP method for one official Steam Web API method.',
      inputSchema: {
        interfaceName: z.string().min(1),
        methodName: z.string().min(1),
        version: z.number().int().positive().optional(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const method = await catalogClient.getMethodSchema({
          interfaceName: args.interfaceName,
          methodName: args.methodName,
          version: args.version,
        });

        return toolSuccess({
          data: {
            ...method,
            access: describeCatalogMethodAccess(method, allowlistedMethods),
          },
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_api_call_readonly',
    {
      title: 'Call a read-only Steam Web API method',
      description: 'Call an official Steam Web API GET method when it passes the default read-only safety policy.',
      inputSchema: {
        interfaceName: z.string().min(1),
        methodName: z.string().min(1),
        version: z.number().int().positive().optional(),
        params: z.record(readonlyApiParameterValueSchema).optional(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const result = await readonlyCaller.call({
          interfaceName: args.interfaceName,
          methodName: args.methodName,
          version: args.version,
          params: args.params,
        });

        return toolSuccess({
          data: {
            request: result.request,
            response: result.response,
          },
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
