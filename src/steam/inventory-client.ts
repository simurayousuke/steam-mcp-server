import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

export type SteamInventoryClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  publisherKey?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export type InventoryRequest = {
  appid: number;
  steamId: string;
};

export type InventoryItemDefsRequest = {
  appid: number;
  modifiedSince?: string;
  itemdefIds?: string[];
  workshopIds?: string[];
  cacheMaxAgeSeconds?: number;
};

export type InventoryPriceSheetRequest = {
  currency: number;
};

export type InventoryQuantityRequest = {
  appid: number;
  steamId: string;
  itemdefIds: string[];
  force?: boolean;
};

export class SteamInventoryClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamInventoryClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getInventory(request: InventoryRequest): Promise<Record<string, unknown>> {
    const input = {
      appid: request.appid,
      steamid: request.steamId,
    };
    const response = await this.callService('GetInventory', input, 'partner');

    return {
      query: {
        appid: request.appid,
        steamId: request.steamId,
      },
      response,
    };
  }

  async getItemDefs(request: InventoryItemDefsRequest): Promise<Record<string, unknown>> {
    const itemdefIds = normalizeOptionalList(request.itemdefIds);
    const workshopIds = normalizeOptionalList(request.workshopIds);
    const input = compactInput({
      appid: request.appid,
      modifiedsince: request.modifiedSince,
      itemdefids: itemdefIds?.join(','),
      workshopids: workshopIds?.join(','),
      cache_max_age_seconds: request.cacheMaxAgeSeconds,
    });
    const response = await this.callService('GetItemDefs', input, 'partner');

    return {
      query: {
        appid: request.appid,
        modifiedSince: request.modifiedSince,
        itemdefIds,
        workshopIds,
        cacheMaxAgeSeconds: request.cacheMaxAgeSeconds,
      },
      response,
    };
  }

  async getPriceSheet(request: InventoryPriceSheetRequest): Promise<Record<string, unknown>> {
    const input = {
      ecurrency: request.currency,
    };
    const response = await this.callService('GetPriceSheet', input, 'api');

    return {
      query: request,
      response,
    };
  }

  async getQuantity(request: InventoryQuantityRequest): Promise<Record<string, unknown>> {
    const itemdefIds = normalizeRequiredList(request.itemdefIds, 'At least one itemdefId is required.');
    const input = compactInput({
      appid: request.appid,
      steamid: request.steamId,
      itemdefid: itemdefIds,
      force: request.force,
    });
    const response = await this.callService('GetQuantity', input, 'partner');

    return {
      query: {
        appid: request.appid,
        steamId: request.steamId,
        itemdefIds,
        force: request.force,
      },
      response,
    };
  }

  private async callService(
    methodName: string,
    input: Record<string, unknown>,
    host: 'api' | 'partner',
  ): Promise<unknown> {
    const publisherKey = resolvePublisherKey(this.options.publisherKey);

    if (!publisherKey) {
      throw missingPublisherKey();
    }

    const origin = host === 'partner' ? 'https://partner.steam-api.com' : 'https://api.steampowered.com';
    const url = new URL(`/IInventoryService/${methodName}/v1/`, origin);
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', publisherKey);
    url.searchParams.set('input_json', JSON.stringify(input));

    const cacheKey = url.toString();
    const cached = this.cache.get(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const raw = await this.options.http.getJson<unknown>(url);
    this.cache.set(cacheKey, raw);
    return raw;
  }
}

function normalizeOptionalList(values: string[] | undefined): string[] | undefined {
  if (values === undefined) {
    return undefined;
  }

  return normalizeRequiredList(values, 'List values must not be empty.');
}

function normalizeRequiredList(values: string[], message: string): string[] {
  const normalized = values.map((value) => value.trim()).filter((value) => value.length > 0);

  if (normalized.length === 0) {
    throw new SteamMcpError({
      code: 'validation_error',
      message,
    });
  }

  return normalized;
}

function compactInput(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function resolvePublisherKey(publisherKey: string | (() => string | undefined) | undefined): string | undefined {
  return typeof publisherKey === 'function' ? publisherKey() : publisherKey;
}

function missingPublisherKey(): SteamMcpError {
  return new SteamMcpError({
    code: 'authorization_required',
    message: 'This Steam Inventory Service method requires STEAM_PUBLISHER_KEY with Economy permissions.',
  });
}
