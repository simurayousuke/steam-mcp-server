import { z } from 'zod';

import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

const storeSearchResponseSchema = z
  .object({
    total: z.number().optional(),
    items: z.array(z.unknown()).default([]),
  })
  .passthrough();

const appDetailsResponseSchema = z.record(
  z.object({
    success: z.boolean(),
    data: z.unknown().optional(),
  }),
);

const packageDetailsResponseSchema = z.record(
  z.object({
    success: z.boolean(),
    data: z.unknown().optional(),
  }),
);

const appReviewsResponseSchema = z
  .object({
    success: z.union([z.boolean(), z.number()]),
    query_summary: z.unknown().optional(),
    reviews: z.array(z.unknown()).default([]),
    cursor: z.string().optional(),
  })
  .passthrough();

const wishlistResponseSchema = z.union([z.record(z.unknown()), z.array(z.unknown())]);

export type SteamStoreClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  country: string;
  language: string;
  cacheTtlMs: number;
};

export type SearchAppsRequest = {
  term: string;
  country?: string;
  language?: string;
  limit?: number;
};

export type GetAppDetailsRequest = {
  appid: number;
  country?: string;
  language?: string;
};

export type GetAppReviewsRequest = {
  appid: number;
  cursor?: string;
  dayRange?: number;
  filter?: 'all' | 'recent' | 'updated' | 'funny' | 'helpful' | 'summary';
  language?: string;
  numPerPage?: number;
  purchaseType?: 'all' | 'steam' | 'non_steam_purchase';
  reviewType?: 'all' | 'positive' | 'negative';
};

export type GetStorePackageRequest = {
  packageId: number;
  country?: string;
  language?: string;
};

export type GetWishlistRequest = {
  steamId?: string;
  vanityName?: string;
  page?: number;
};

export class SteamStoreClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamStoreClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async searchApps(request: SearchAppsRequest): Promise<Record<string, unknown>> {
    const url = new URL('https://store.steampowered.com/api/storesearch/');
    url.searchParams.set('term', request.term);
    url.searchParams.set('cc', request.country ?? this.options.country);
    url.searchParams.set('l', request.language ?? this.options.language);

    if (request.limit !== undefined) {
      url.searchParams.set('count', String(request.limit));
    }

    const raw = await this.getCachedJson(url);
    const parsed = storeSearchResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidStoreResponse('Steam store search response did not match the expected schema.', parsed.error);
    }

    return {
      query: {
        term: request.term,
        country: request.country ?? this.options.country,
        language: request.language ?? this.options.language,
        limit: request.limit,
      },
      total: parsed.data.total ?? parsed.data.items.length,
      items: request.limit === undefined ? parsed.data.items : parsed.data.items.slice(0, request.limit),
    };
  }

  async getAppDetails(request: GetAppDetailsRequest): Promise<Record<string, unknown>> {
    const appid = String(request.appid);
    const url = new URL('https://store.steampowered.com/api/appdetails');
    url.searchParams.set('appids', appid);
    url.searchParams.set('cc', request.country ?? this.options.country);
    url.searchParams.set('l', request.language ?? this.options.language);

    const raw = await this.getCachedJson(url);
    const parsed = appDetailsResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidStoreResponse('Steam app details response did not match the expected schema.', parsed.error);
    }

    const entry = parsed.data[appid];

    if (!entry?.success) {
      throw new SteamMcpError({
        code: 'not_found',
        message: `Steam app details not found for appid ${request.appid}.`,
      });
    }

    return {
      appid: request.appid,
      country: request.country ?? this.options.country,
      language: request.language ?? this.options.language,
      data: entry.data,
    };
  }

  async getAppReviews(request: GetAppReviewsRequest): Promise<Record<string, unknown>> {
    const url = new URL(`https://store.steampowered.com/appreviews/${request.appid}`);
    url.searchParams.set('json', '1');
    url.searchParams.set('filter', request.filter ?? 'summary');
    url.searchParams.set('language', request.language ?? this.options.language);
    url.searchParams.set('purchase_type', request.purchaseType ?? 'all');
    url.searchParams.set('review_type', request.reviewType ?? 'all');

    if (request.cursor !== undefined) {
      url.searchParams.set('cursor', request.cursor);
    }

    if (request.dayRange !== undefined) {
      url.searchParams.set('day_range', String(request.dayRange));
    }

    if (request.numPerPage !== undefined) {
      url.searchParams.set('num_per_page', String(request.numPerPage));
    }

    const raw = await this.getCachedJson(url);
    const parsed = appReviewsResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidStoreResponse('Steam app reviews response did not match the expected schema.', parsed.error);
    }

    if (!isSteamSuccess(parsed.data.success)) {
      throw new SteamMcpError({
        code: 'not_found',
        message: `Steam app reviews not found for appid ${request.appid}.`,
      });
    }

    return {
      appid: request.appid,
      query: {
        filter: request.filter ?? 'summary',
        language: request.language ?? this.options.language,
        purchaseType: request.purchaseType ?? 'all',
        reviewType: request.reviewType ?? 'all',
        numPerPage: request.numPerPage,
      },
      querySummary: parsed.data.query_summary,
      reviews: parsed.data.reviews,
      cursor: parsed.data.cursor,
    };
  }

  async getStorePackage(request: GetStorePackageRequest): Promise<Record<string, unknown>> {
    const packageId = String(request.packageId);
    const url = new URL('https://store.steampowered.com/api/packagedetails');
    url.searchParams.set('packageids', packageId);
    url.searchParams.set('cc', request.country ?? this.options.country);
    url.searchParams.set('l', request.language ?? this.options.language);

    const raw = await this.getCachedJson(url);
    const parsed = packageDetailsResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidStoreResponse('Steam package details response did not match the expected schema.', parsed.error);
    }

    const entry = parsed.data[packageId];

    if (!entry?.success) {
      throw new SteamMcpError({
        code: 'not_found',
        message: `Steam package details not found for package ${request.packageId}.`,
      });
    }

    return {
      packageId: request.packageId,
      country: request.country ?? this.options.country,
      language: request.language ?? this.options.language,
      data: entry.data,
    };
  }

  async getPublicWishlist(request: GetWishlistRequest): Promise<Record<string, unknown>> {
    if (Boolean(request.steamId) === Boolean(request.vanityName)) {
      throw new SteamMcpError({
        code: 'validation_error',
        message: 'Exactly one of steamId or vanityName is required.',
      });
    }

    const page = request.page ?? 0;
    const path = request.steamId
      ? `/wishlist/profiles/${encodeURIComponent(request.steamId)}/wishlistdata/`
      : `/wishlist/id/${encodeURIComponent(request.vanityName ?? '')}/wishlistdata/`;
    const url = new URL(path, 'https://store.steampowered.com');
    url.searchParams.set('p', String(page));

    const raw = await this.getCachedJson(url);
    const parsed = wishlistResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidStoreResponse('Steam wishlist response did not match the expected JSON schema.', parsed.error);
    }

    if (Array.isArray(parsed.data)) {
      return {
        query: {
          steamId: request.steamId,
          vanityName: request.vanityName,
          page,
        },
        apps: parsed.data,
        count: parsed.data.length,
      };
    }

    const apps = Object.entries(parsed.data).map(([appid, data]) => ({
      appid: Number.parseInt(appid, 10),
      data,
    }));

    return {
      query: {
        steamId: request.steamId,
        vanityName: request.vanityName,
        page,
      },
      apps,
      count: apps.length,
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

function invalidStoreResponse(message: string, error: z.ZodError): SteamMcpError {
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
