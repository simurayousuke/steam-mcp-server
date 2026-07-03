import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamWebApiCatalogClient } from '../catalog/steam-web-api-catalog.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';

export function registerCatalogTools(server: McpServer, catalogClient: SteamWebApiCatalogClient): void {
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

        return toolSuccess({
          data: {
            interfaceName: args.interfaceName,
            methods,
            count: methods.length,
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
          data: method,
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
