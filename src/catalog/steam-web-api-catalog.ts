import { z } from 'zod';

import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

const catalogParameterSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  optional: z.union([z.boolean(), z.literal(0), z.literal(1)]).optional(),
  description: z.string().optional(),
});

const catalogMethodSchema = z.object({
  name: z.string(),
  version: z.number(),
  httpmethod: z.string().optional(),
  parameters: z.array(catalogParameterSchema).default([]),
});

const catalogInterfaceSchema = z.object({
  name: z.string(),
  methods: z.array(catalogMethodSchema).default([]),
});

const catalogResponseSchema = z.object({
  apilist: z.object({
    interfaces: z.array(catalogInterfaceSchema),
  }),
});

export type SteamWebApiParameter = {
  name: string;
  type?: string;
  optional: boolean;
  description?: string;
};

export type SteamWebApiMethod = {
  name: string;
  version: number;
  httpMethod: string;
  parameters: SteamWebApiParameter[];
};

export type SteamWebApiInterface = {
  name: string;
  methods: SteamWebApiMethod[];
};

export type SteamWebApiCatalog = {
  fetchedAt: string;
  interfaces: SteamWebApiInterface[];
};

export type SteamWebApiCatalogClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  apiKey?: string;
  cacheTtlMs: number;
};

export class SteamWebApiCatalogClient {
  private readonly cache: TtlCache<SteamWebApiCatalog>;

  constructor(private readonly options: SteamWebApiCatalogClientOptions) {
    this.cache = new TtlCache<SteamWebApiCatalog>(options.cacheTtlMs);
  }

  async getCatalog(options: { refresh?: boolean } = {}): Promise<SteamWebApiCatalog> {
    const cacheKey = this.options.apiKey ? 'catalog:with-key' : 'catalog:anonymous';
    const cached = options.refresh ? undefined : this.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const url = new URL('https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/');
    url.searchParams.set('format', 'json');

    if (this.options.apiKey) {
      url.searchParams.set('key', this.options.apiKey);
    }

    const rawCatalog = await this.options.http.getJson<unknown>(url);
    const parsed = catalogResponseSchema.safeParse(rawCatalog);

    if (!parsed.success) {
      throw new SteamMcpError({
        code: 'upstream_error',
        message: 'Steam Web API catalog response did not match the expected schema.',
        details: {
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
    }

    const catalog = normalizeCatalog(parsed.data.apilist.interfaces);

    this.cache.set(cacheKey, catalog);
    return catalog;
  }

  async listInterfaces(filter: CatalogInterfaceFilter = {}): Promise<SteamWebApiInterfaceSummary[]> {
    const catalog = await this.getCatalog();
    const nameContains = filter.nameContains?.toLowerCase();

    return catalog.interfaces
      .filter((apiInterface) => (nameContains ? apiInterface.name.toLowerCase().includes(nameContains) : true))
      .map((apiInterface) => ({
        name: apiInterface.name,
        methodCount: apiInterface.methods.length,
        methods: apiInterface.methods.map((method) => `${method.name}/v${method.version}`),
      }));
  }

  async listMethods(filter: CatalogMethodFilter): Promise<SteamWebApiMethodSummary[]> {
    const apiInterface = await this.findInterface(filter.interfaceName);
    const nameContains = filter.nameContains?.toLowerCase();

    return apiInterface.methods
      .filter((method) => (nameContains ? method.name.toLowerCase().includes(nameContains) : true))
      .map((method) => ({
        interfaceName: apiInterface.name,
        name: method.name,
        version: method.version,
        httpMethod: method.httpMethod,
        parameterCount: method.parameters.length,
        requiredParameters: method.parameters.filter((parameter) => !parameter.optional).map((parameter) => parameter.name),
        optionalParameters: method.parameters.filter((parameter) => parameter.optional).map((parameter) => parameter.name),
      }));
  }

  async getMethodSchema(filter: CatalogMethodSchemaFilter): Promise<SteamWebApiMethodSchema> {
    const apiInterface = await this.findInterface(filter.interfaceName);
    const method = apiInterface.methods.find(
      (candidate) =>
        candidate.name.toLowerCase() === filter.methodName.toLowerCase() &&
        (filter.version === undefined || candidate.version === filter.version),
    );

    if (!method) {
      throw new SteamMcpError({
        code: 'not_found',
        message: `Steam Web API method not found: ${filter.interfaceName}.${filter.methodName}.`,
      });
    }

    return {
      interfaceName: apiInterface.name,
      name: method.name,
      version: method.version,
      httpMethod: method.httpMethod,
      parameters: method.parameters,
    };
  }

  private async findInterface(interfaceName: string): Promise<SteamWebApiInterface> {
    const catalog = await this.getCatalog();
    const apiInterface = catalog.interfaces.find(
      (candidate) => candidate.name.toLowerCase() === interfaceName.toLowerCase(),
    );

    if (!apiInterface) {
      throw new SteamMcpError({
        code: 'not_found',
        message: `Steam Web API interface not found: ${interfaceName}.`,
      });
    }

    return apiInterface;
  }
}

export type CatalogInterfaceFilter = {
  nameContains?: string;
};

export type CatalogMethodFilter = {
  interfaceName: string;
  nameContains?: string;
};

export type CatalogMethodSchemaFilter = {
  interfaceName: string;
  methodName: string;
  version?: number;
};

export type SteamWebApiInterfaceSummary = {
  name: string;
  methodCount: number;
  methods: string[];
};

export type SteamWebApiMethodSummary = {
  interfaceName: string;
  name: string;
  version: number;
  httpMethod: string;
  parameterCount: number;
  requiredParameters: string[];
  optionalParameters: string[];
};

export type SteamWebApiMethodSchema = {
  interfaceName: string;
  name: string;
  version: number;
  httpMethod: string;
  parameters: SteamWebApiParameter[];
};

function normalizeCatalog(interfaces: z.infer<typeof catalogInterfaceSchema>[]): SteamWebApiCatalog {
  return {
    fetchedAt: new Date().toISOString(),
    interfaces: interfaces
      .map((apiInterface) => ({
        name: apiInterface.name,
        methods: apiInterface.methods
          .map((method) => ({
            name: method.name,
            version: method.version,
            httpMethod: method.httpmethod?.toUpperCase() ?? 'GET',
            parameters: method.parameters.map((parameter) => ({
              name: parameter.name,
              type: parameter.type,
              optional: parameter.optional === true || parameter.optional === 1,
              description: parameter.description,
            })),
          }))
          .sort(compareMethods),
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  };
}

function compareMethods(left: SteamWebApiMethod, right: SteamWebApiMethod): number {
  const nameComparison = left.name.localeCompare(right.name);

  if (nameComparison !== 0) {
    return nameComparison;
  }

  return left.version - right.version;
}
