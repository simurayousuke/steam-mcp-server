import { readFileSync } from 'node:fs';

import { SteamMcpError } from '../common/errors.js';

export type ApiMethodIdentifier = {
  interfaceName: string;
  methodName: string;
  version: number;
};

export function loadApiAllowlist(filePath: string | undefined): Set<string> {
  if (!filePath) {
    return new Set();
  }

  try {
    const text = readFileSync(filePath, 'utf8');
    const methods = text
      .split(/\r?\n/)
      .map((line) => line.split('#')[0]?.trim() ?? '')
      .filter((line) => line.length > 0)
      .map(normalizeMethodIdentifier);

    return new Set(methods);
  } catch (error: unknown) {
    if (error instanceof SteamMcpError) {
      throw error;
    }

    throw new SteamMcpError({
      code: 'configuration_error',
      message: `Failed to read Steam API allowlist file: ${filePath}.`,
      cause: error,
    });
  }
}

export function methodIdentifier(method: ApiMethodIdentifier): string {
  return normalizeMethodIdentifier(`${method.interfaceName}.${method.methodName}.v${method.version}`);
}

function normalizeMethodIdentifier(value: string): string {
  const match = value.match(/^([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)\.v(\d+)$/);

  if (!match) {
    throw new SteamMcpError({
      code: 'configuration_error',
      message: `Invalid Steam API allowlist method identifier: ${value}. Expected Interface.Method.vVersion.`,
    });
  }

  const [, interfaceName, methodName, version] = match;
  return `${interfaceName.toLowerCase()}.${methodName.toLowerCase()}.v${Number.parseInt(version, 10)}`;
}
