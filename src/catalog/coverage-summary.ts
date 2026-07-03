import { getReservedApiParameterNames, isReservedApiParameterName, isSecretApiParameterName } from './api-parameters.js';
import { classifyReadonlySafety } from './safety.js';
import type { SteamWebApiCatalog, SteamWebApiMethodSchema } from './steam-web-api-catalog.js';
import { methodIdentifier } from '../config/allowlist.js';

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

export function describeCatalogMethodAccess(
  method: SteamWebApiMethodSchema,
  allowlistedMethods: ReadonlySet<string> = new Set(),
) {
  const safety = classifyReadonlySafety(method);
  const identifier = methodIdentifier({
    interfaceName: method.interfaceName,
    methodName: method.name,
    version: method.version,
  });
  const allowlisted = allowlistedMethods.has(identifier);
  const secretParameters = method.parameters
    .filter((parameter) => isSecretApiParameterName(parameter.name))
    .map((parameter) => parameter.name);
  const requiredUserParameters = method.parameters
    .filter((parameter) => !parameter.optional)
    .filter((parameter) => !isSecretApiParameterName(parameter.name))
    .filter((parameter) => !isReservedApiParameterName(parameter.name))
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
    requiresOAuthAccessToken: method.parameters.some(
      (parameter) => parameter.name.toLowerCase() === 'access_token' && !parameter.optional,
    ),
    secretParameters,
    reservedServerParameters: getReservedApiParameterNames(),
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
