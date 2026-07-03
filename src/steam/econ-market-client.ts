import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

export type SteamEconMarketClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  publisherKey?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export type MarketEligibilityRequest = {
  steamId: string;
};

export type MarketAssetIdRequest = {
  appid: number;
  listingId: string;
};

export type MarketPopularRequest = {
  language?: string;
  rows?: number;
  start?: number;
  filterAppid?: number;
  currency?: number;
};

export class SteamEconMarketClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamEconMarketClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getMarketEligibility(request: MarketEligibilityRequest): Promise<Record<string, unknown>> {
    const response = await this.call('GetMarketEligibility', {
      steamid: request.steamId,
    });

    return {
      query: request,
      response,
    };
  }

  async getAssetId(request: MarketAssetIdRequest): Promise<Record<string, unknown>> {
    const response = await this.call('GetAssetID', {
      appid: request.appid,
      listingid: request.listingId,
    });

    return {
      query: request,
      response,
    };
  }

  async getPopular(request: MarketPopularRequest): Promise<Record<string, unknown>> {
    const response = await this.call('GetPopular', {
      language: request.language,
      rows: request.rows,
      start: request.start,
      filter_appid: request.filterAppid,
      ecurrency: request.currency,
    });

    return {
      query: request,
      response,
    };
  }

  private async call(methodName: string, input: Record<string, string | number | undefined>): Promise<unknown> {
    const publisherKey = resolvePublisherKey(this.options.publisherKey);

    if (!publisherKey) {
      throw new SteamMcpError({
        code: 'authorization_required',
        message: 'This Steam Economy Market method requires STEAM_PUBLISHER_KEY with Economy permissions.',
      });
    }

    const url = new URL(`https://partner.steam-api.com/IEconMarketService/${methodName}/v1/`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', publisherKey);
    url.searchParams.set('input_json', JSON.stringify(compactInput(input)));

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

function compactInput(input: Record<string, string | number | undefined>): Record<string, string | number> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Record<string, string | number>;
}

function resolvePublisherKey(publisherKey: string | (() => string | undefined) | undefined): string | undefined {
  return typeof publisherKey === 'function' ? publisherKey() : publisherKey;
}
