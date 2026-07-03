import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

export type SteamEconServiceClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  webApiKey?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export type TradeHistoryRequest = {
  maxTrades?: number;
  startAfterTime?: number;
  startAfterTradeId?: string;
  navigatingBack?: boolean;
  getDescriptions?: boolean;
  language?: string;
  includeFailed?: boolean;
  includeTotal?: boolean;
};

export type TradeOffersRequest = {
  getSentOffers?: boolean;
  getReceivedOffers?: boolean;
  getDescriptions?: boolean;
  language?: string;
  activeOnly?: boolean;
  historicalOnly?: boolean;
  timeHistoricalCutoff?: number;
};

export type TradeOfferRequest = {
  tradeOfferId: string;
  language?: string;
};

export type TradeOffersSummaryRequest = {
  timeLastVisit?: number;
};

export class SteamEconServiceClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamEconServiceClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getTradeHistory(request: TradeHistoryRequest): Promise<Record<string, unknown>> {
    const response = await this.call('GetTradeHistory', {
      max_trades: request.maxTrades,
      start_after_time: request.startAfterTime,
      start_after_tradeid: request.startAfterTradeId,
      navigating_back: request.navigatingBack,
      get_descriptions: request.getDescriptions,
      language: request.language,
      include_failed: request.includeFailed,
      include_total: request.includeTotal,
    });

    return {
      query: request,
      response,
    };
  }

  async getTradeOffers(request: TradeOffersRequest): Promise<Record<string, unknown>> {
    const response = await this.call('GetTradeOffers', {
      get_sent_offers: request.getSentOffers,
      get_received_offers: request.getReceivedOffers,
      get_descriptions: request.getDescriptions,
      language: request.language,
      active_only: request.activeOnly,
      historical_only: request.historicalOnly,
      time_historical_cutoff: request.timeHistoricalCutoff,
    });

    return {
      query: request,
      response,
    };
  }

  async getTradeOffer(request: TradeOfferRequest): Promise<Record<string, unknown>> {
    const response = await this.call('GetTradeOffer', {
      tradeofferid: request.tradeOfferId,
      language: request.language,
    });

    return {
      query: request,
      response,
    };
  }

  async getTradeOffersSummary(request: TradeOffersSummaryRequest): Promise<Record<string, unknown>> {
    const response = await this.call('GetTradeOffersSummary', {
      time_last_visit: request.timeLastVisit,
    });

    return {
      query: request,
      response,
    };
  }

  private async call(methodName: string, params: Record<string, string | number | boolean | undefined>): Promise<unknown> {
    const webApiKey = resolveWebApiKey(this.options.webApiKey);

    if (!webApiKey) {
      throw new SteamMcpError({
        code: 'authentication_required',
        message: 'This Steam Economy Service method requires STEAM_WEB_API_KEY.',
      });
    }

    const url = new URL(`https://api.steampowered.com/IEconService/${methodName}/v1/`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', webApiKey);

    for (const [name, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(name, String(value));
      }
    }

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

function resolveWebApiKey(webApiKey: string | (() => string | undefined) | undefined): string | undefined {
  return typeof webApiKey === 'function' ? webApiKey() : webApiKey;
}
