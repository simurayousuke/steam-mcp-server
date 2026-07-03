import { z } from 'zod';

import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

const inventoryResponseSchema = z
  .object({
    success: z.union([z.boolean(), z.number()]).optional(),
    assets: z.array(z.unknown()).default([]),
    descriptions: z.array(z.unknown()).default([]),
    more_items: z.union([z.boolean(), z.number()]).optional(),
    last_assetid: z.string().optional(),
    total_inventory_count: z.number().optional(),
  })
  .passthrough();

export type SteamCommunityClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  language: string;
  cacheTtlMs: number;
};

export type GetPublicInventoryRequest = {
  steamId: string;
  appid: number;
  contextId: string;
  count?: number;
  language?: string;
  startAssetId?: string;
};

export class SteamCommunityClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamCommunityClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getPublicInventory(request: GetPublicInventoryRequest): Promise<Record<string, unknown>> {
    const url = new URL(
      `/inventory/${encodeURIComponent(request.steamId)}/${request.appid}/${encodeURIComponent(request.contextId)}`,
      'https://steamcommunity.com',
    );
    url.searchParams.set('l', request.language ?? this.options.language);
    url.searchParams.set('count', String(request.count ?? 500));

    if (request.startAssetId !== undefined) {
      url.searchParams.set('start_assetid', request.startAssetId);
    }

    const raw = await this.getCachedJson(url);
    const parsed = inventoryResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw new SteamMcpError({
        code: 'upstream_error',
        message: 'Steam inventory response did not match the expected schema.',
        details: {
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
    }

    if (parsed.data.success !== undefined && !isSteamSuccess(parsed.data.success)) {
      throw new SteamMcpError({
        code: 'private_or_forbidden',
        message: `Steam inventory is not publicly visible for steamId ${request.steamId}, app ${request.appid}, context ${request.contextId}.`,
      });
    }

    return {
      query: {
        steamId: request.steamId,
        appid: request.appid,
        contextId: request.contextId,
        language: request.language ?? this.options.language,
        count: request.count ?? 500,
        startAssetId: request.startAssetId,
      },
      assets: parsed.data.assets,
      descriptions: parsed.data.descriptions,
      moreItems: isSteamSuccess(parsed.data.more_items ?? false),
      lastAssetId: parsed.data.last_assetid,
      totalInventoryCount: parsed.data.total_inventory_count,
    };
  }

  private async getCachedJson(url: URL): Promise<unknown> {
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

function isSteamSuccess(value: boolean | number): boolean {
  return value === true || value === 1;
}
