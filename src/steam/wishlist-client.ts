import { z } from 'zod';

import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

const wishlistResponseSchema = z
  .object({
    response: z
      .object({
        items: z.array(z.unknown()).default([]),
      })
      .passthrough(),
  })
  .passthrough();

const wishlistItemCountResponseSchema = z
  .object({
    response: z
      .object({
        count: z.number().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const sortedFilteredWishlistResponseSchema = z
  .object({
    response: z.record(z.unknown()).default({}),
  })
  .passthrough();

export type SteamWishlistClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  cacheTtlMs: number;
};

export type WishlistSteamIdRequest = {
  steamId: string;
};

export type WishlistSortedFilteredRequest = WishlistSteamIdRequest & {
  context?: Record<string, unknown>;
  dataRequest?: Record<string, unknown>;
  sortOrder?: number;
  filters?: Record<string, unknown>;
  startIndex?: number;
  pageSize?: number;
  shareToken?: string;
};

export class SteamWishlistClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamWishlistClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getWishlist(request: WishlistSteamIdRequest): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/IWishlistService/GetWishlist/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('steamid', request.steamId);

    const raw = await this.getCachedJson(url);
    const parsed = wishlistResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidWishlistResponse('Steam wishlist response did not match the expected schema.', parsed.error);
    }

    return {
      steamId: request.steamId,
      count: parsed.data.response.items.length,
      items: parsed.data.response.items,
      response: parsed.data.response,
    };
  }

  async getWishlistItemCount(request: WishlistSteamIdRequest): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/IWishlistService/GetWishlistItemCount/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('steamid', request.steamId);

    const raw = await this.getCachedJson(url);
    const parsed = wishlistItemCountResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidWishlistResponse('Steam wishlist item count response did not match the expected schema.', parsed.error);
    }

    return {
      steamId: request.steamId,
      count: parsed.data.response.count ?? 0,
      response: parsed.data.response,
    };
  }

  async getWishlistSortedFiltered(request: WishlistSortedFilteredRequest): Promise<Record<string, unknown>> {
    const inputJson = removeUndefined({
      steamid: request.steamId,
      context: request.context ?? {},
      data_request: request.dataRequest,
      sort_order: request.sortOrder,
      filters: request.filters ?? {},
      start_index: request.startIndex,
      page_size: request.pageSize,
      share_token: request.shareToken,
    });
    const url = new URL('https://api.steampowered.com/IWishlistService/GetWishlistSortedFiltered/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('input_json', JSON.stringify(inputJson));

    const raw = await this.getCachedJson(url);
    const parsed = sortedFilteredWishlistResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidWishlistResponse('Steam sorted and filtered wishlist response did not match the expected schema.', parsed.error);
    }

    return {
      query: request,
      response: parsed.data.response,
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

function removeUndefined(params: Record<string, unknown | undefined>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) {
      result[name] = value;
    }
  }

  return result;
}

function invalidWishlistResponse(message: string, error: z.ZodError): SteamMcpError {
  return new SteamMcpError({
    code: 'upstream_error',
    message,
    details: {
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    },
  });
}
