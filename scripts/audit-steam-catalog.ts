import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_CATALOG_URL = 'https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/?format=json';
const DEFAULT_AUDIT_DOC = 'docs/official-webapi-audit.md';

type SteamCatalogInterface = {
  name: string;
  methods?: SteamCatalogMethod[];
};

type SteamCatalogMethod = {
  name: string;
  version: number;
};

type SteamCatalogResponse = {
  apilist?: {
    interfaces?: SteamCatalogInterface[];
  };
};

export type CatalogAuditResult = {
  catalogUrl: string;
  auditDocPath: string;
  interfaceCount: number;
  interfaces: string[];
  methodCount: number;
  methods: string[];
  missingInterfaces: string[];
  missingMethods: string[];
  missing: string[];
};

export function normalizeInterfaceName(interfaceName: string): string {
  return interfaceName.replace(/^IGCVersion_\d+$/, 'IGCVersion_<appid>');
}

export function extractDocumentedInterfaces(auditDocText: string): Set<string> {
  const documented = new Set<string>();
  const rowPattern = /^\| `([^`]+)` \|/gm;
  let match: RegExpExecArray | null;

  while ((match = rowPattern.exec(auditDocText)) !== null) {
    documented.add(match[1] ?? '');
  }

  documented.delete('');
  return documented;
}

export function normalizeMethodIdentifier(interfaceName: string, methodName: string, version: number): string {
  return `${normalizeInterfaceName(interfaceName)}.${methodName}.v${version}`;
}

export function extractDocumentedMethodIdentifiers(auditDocText: string): Set<string> {
  const documented = new Set<string>();
  const methodPattern = /`([A-Za-z0-9_<>\-]+(?:\.[A-Za-z0-9_]+\.v\d+))`/g;
  let match: RegExpExecArray | null;

  while ((match = methodPattern.exec(auditDocText)) !== null) {
    documented.add(match[1] ?? '');
  }

  documented.delete('');
  return documented;
}

export function getCatalogInterfaceNames(catalog: SteamCatalogResponse): string[] {
  const interfaces = catalog.apilist?.interfaces ?? [];
  return [...new Set(interfaces.map((entry) => normalizeInterfaceName(entry.name)))].sort();
}

export function getCatalogMethodIdentifiers(catalog: SteamCatalogResponse): string[] {
  const interfaces = catalog.apilist?.interfaces ?? [];

  return [
    ...new Set(
      interfaces.flatMap((apiInterface) =>
        (apiInterface.methods ?? []).map((method) =>
          normalizeMethodIdentifier(apiInterface.name, method.name, method.version),
        ),
      ),
    ),
  ].sort();
}

export function auditCatalogCoverage(input: {
  auditDocText: string;
  catalog: SteamCatalogResponse;
  catalogUrl?: string;
  auditDocPath?: string;
}): CatalogAuditResult {
  const interfaces = getCatalogInterfaceNames(input.catalog);
  const methods = getCatalogMethodIdentifiers(input.catalog);
  const documented = extractDocumentedInterfaces(input.auditDocText);
  const documentedMethods = extractDocumentedMethodIdentifiers(input.auditDocText);
  const missing = interfaces.filter((interfaceName) => !documented.has(interfaceName));
  const missingMethods = methods.filter((methodIdentifier) => !documentedMethods.has(methodIdentifier));

  return {
    catalogUrl: input.catalogUrl ?? DEFAULT_CATALOG_URL,
    auditDocPath: input.auditDocPath ?? DEFAULT_AUDIT_DOC,
    interfaceCount: interfaces.length,
    interfaces,
    methodCount: methods.length,
    methods,
    missingInterfaces: missing,
    missingMethods,
    missing,
  };
}

export async function fetchCatalog(catalogUrl: string): Promise<SteamCatalogResponse> {
  const response = await fetch(catalogUrl);

  if (!response.ok) {
    throw new Error(`Steam catalog request failed with HTTP ${response.status}.`);
  }

  return (await response.json()) as SteamCatalogResponse;
}

async function main(): Promise<void> {
  const catalogUrl = process.env.STEAM_CATALOG_AUDIT_URL ?? DEFAULT_CATALOG_URL;
  const auditDocPath = process.env.STEAM_CATALOG_AUDIT_DOC ?? DEFAULT_AUDIT_DOC;
  const [catalog, auditDocText] = await Promise.all([
    fetchCatalog(catalogUrl),
    readFile(resolve(auditDocPath), 'utf8'),
  ]);
  const result = auditCatalogCoverage({
    auditDocText,
    catalog,
    catalogUrl,
    auditDocPath,
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.missing.length > 0 || result.missingMethods.length > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
