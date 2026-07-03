import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { classifyReadonlySafety } from '../catalog/safety.js';
import type { SteamWebApiCatalog, SteamWebApiCatalogClient } from '../catalog/steam-web-api-catalog.js';
import type { SteamWebApiMethodSchema } from '../catalog/steam-web-api-catalog.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import { methodIdentifier } from '../config/allowlist.js';
import type { SteamWebApiReadonlyCaller } from '../steam/web-api-readonly-caller.js';

const readonlyApiParameterValueSchema = z.union([z.string(), z.number(), z.boolean()]);
const secretParameterNames = new Set(['key', 'access_token', 'token']);

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
              access: describeMethodAccess(schema, allowlistedMethods),
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
            access: describeMethodAccess(method, allowlistedMethods),
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

export type CatalogCoverageReasonCount = {
  reason: string;
  count: number;
};

export type CatalogInterfaceCoverageSummary = {
  name: string;
  methodCount: number;
  defaultAllowedMethods: number;
  allowlistedBlockedMethods: number;
  blockedMethods: number;
  postMethods: number;
  defaultBlockedReasonCounts: CatalogCoverageReasonCount[];
};

export type CatalogCoverageSummary = {
  fetchedAt: string;
  interfaceCount: number;
  methodCount: number;
  defaultAllowedMethods: number;
  allowlistedBlockedMethods: number;
  blockedMethods: number;
  postMethods: number;
  configuredAllowlistCount: number;
  defaultBlockedReasonCounts: CatalogCoverageReasonCount[];
  interfaces: CatalogInterfaceCoverageSummary[];
};

export function buildCatalogCoverageSummary(
  catalog: SteamWebApiCatalog,
  allowlistedMethods: ReadonlySet<string> = new Set(),
): CatalogCoverageSummary {
  const summary: CatalogCoverageSummary = {
    fetchedAt: catalog.fetchedAt,
    interfaceCount: catalog.interfaces.length,
    methodCount: 0,
    defaultAllowedMethods: 0,
    allowlistedBlockedMethods: 0,
    blockedMethods: 0,
    postMethods: 0,
    configuredAllowlistCount: allowlistedMethods.size,
    defaultBlockedReasonCounts: [],
    interfaces: [],
  };
  const globalReasonCounts = new Map<string, number>();

  for (const apiInterface of catalog.interfaces) {
    const interfaceSummary: CatalogInterfaceCoverageSummary = {
      name: apiInterface.name,
      methodCount: apiInterface.methods.length,
      defaultAllowedMethods: 0,
      allowlistedBlockedMethods: 0,
      blockedMethods: 0,
      postMethods: 0,
      defaultBlockedReasonCounts: [],
    };
    const interfaceReasonCounts = new Map<string, number>();

    for (const method of apiInterface.methods) {
      summary.methodCount += 1;

      if (method.httpMethod === 'POST') {
        summary.postMethods += 1;
        interfaceSummary.postMethods += 1;
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
        summary.defaultAllowedMethods += 1;
        interfaceSummary.defaultAllowedMethods += 1;
        continue;
      }

      incrementReasonCounts(globalReasonCounts, safety.reasons);
      incrementReasonCounts(interfaceReasonCounts, safety.reasons);

      if (allowlistedMethods.has(identifier)) {
        summary.allowlistedBlockedMethods += 1;
        interfaceSummary.allowlistedBlockedMethods += 1;
      } else {
        summary.blockedMethods += 1;
        interfaceSummary.blockedMethods += 1;
      }
    }

    interfaceSummary.defaultBlockedReasonCounts = toReasonCounts(interfaceReasonCounts);
    summary.interfaces.push(interfaceSummary);
  }

  summary.defaultBlockedReasonCounts = toReasonCounts(globalReasonCounts);
  return summary;
}

function describeMethodAccess(method: SteamWebApiMethodSchema, allowlistedMethods: ReadonlySet<string>) {
  const safety = classifyReadonlySafety(method);
  const identifier = methodIdentifier({
    interfaceName: method.interfaceName,
    methodName: method.name,
    version: method.version,
  });
  const allowlisted = allowlistedMethods.has(identifier);
  const secretParameters = method.parameters
    .filter((parameter) => secretParameterNames.has(parameter.name.toLowerCase()))
    .map((parameter) => parameter.name);
  const requiredUserParameters = method.parameters
    .filter((parameter) => !parameter.optional)
    .filter((parameter) => !secretParameterNames.has(parameter.name.toLowerCase()))
    .map((parameter) => parameter.name);

  return {
    methodIdentifier: identifier,
    defaultReadOnlyAllowed: safety.allowed,
    allowlisted,
    callableByGenericReadOnlyTool: (safety.allowed || allowlisted) && (method.httpMethod === 'GET' || method.httpMethod === 'POST'),
    reasons: safety.reasons,
    requiresWebApiKey: method.parameters.some(
      (parameter) => parameter.name.toLowerCase() === 'key' && !parameter.optional,
    ),
    secretParameters,
    requiredUserParameters,
  };
}

function incrementReasonCounts(reasonCounts: Map<string, number>, reasons: string[]): void {
  for (const reason of reasons) {
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
  }
}

function toReasonCounts(reasonCounts: Map<string, number>): CatalogCoverageReasonCount[] {
  return [...reasonCounts.entries()]
    .map(([reason, count]) => ({
      reason,
      count,
    }))
    .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason));
}
