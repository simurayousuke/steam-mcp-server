import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { classifyReadonlySafety } from '../catalog/safety.js';
import type { SteamWebApiCatalogClient } from '../catalog/steam-web-api-catalog.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import { methodIdentifier } from '../config/allowlist.js';
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
        let totalMethods = 0;
        let defaultAllowedMethods = 0;
        let allowlistedBlockedMethods = 0;
        let blockedMethods = 0;
        let postMethods = 0;

        for (const apiInterface of catalog.interfaces) {
          for (const method of apiInterface.methods) {
            totalMethods += 1;

            if (method.httpMethod === 'POST') {
              postMethods += 1;
            }

            const safety = classifyReadonlySafety({
              interfaceName: apiInterface.name,
              name: method.name,
              version: method.version,
              httpMethod: method.httpMethod,
              parameters: method.parameters,
            });
            const identifier = methodIdentifier({
              interfaceName: apiInterface.name,
              methodName: method.name,
              version: method.version,
            });

            if (safety.allowed) {
              defaultAllowedMethods += 1;
            } else if (allowlistedMethods.has(identifier)) {
              allowlistedBlockedMethods += 1;
            } else {
              blockedMethods += 1;
            }
          }
        }

        return toolSuccess({
          data: {
            fetchedAt: catalog.fetchedAt,
            interfaceCount: catalog.interfaces.length,
            methodCount: totalMethods,
            defaultAllowedMethods,
            allowlistedBlockedMethods,
            blockedMethods,
            postMethods,
            configuredAllowlistCount: allowlistedMethods.size,
          },
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
