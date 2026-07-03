import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

export type SteamPartnerFinancialsClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  financialKey?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export type ChangedDatesForPartnerRequest = {
  highWatermark: string;
  includeViewGrants?: boolean;
};

export type DetailedSalesRequest = {
  date: string;
  highWatermarkId: string;
  includeViewGrants?: boolean;
};

export type AppWishlistReportingRequest = {
  appid: number;
  date: string;
};

export class SteamPartnerFinancialsClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamPartnerFinancialsClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getChangedDatesForPartner(request: ChangedDatesForPartnerRequest): Promise<Record<string, unknown>> {
    const response = await this.call('GetChangedDatesForPartner', {
      highwatermark: request.highWatermark,
      include_view_grants: request.includeViewGrants,
    });

    return {
      query: request,
      response,
    };
  }

  async getDetailedSales(request: DetailedSalesRequest): Promise<Record<string, unknown>> {
    const response = await this.call('GetDetailedSales', {
      date: request.date,
      highwatermark_id: request.highWatermarkId,
      include_view_grants: request.includeViewGrants,
    });

    return {
      query: request,
      response,
    };
  }

  async getAppWishlistReporting(request: AppWishlistReportingRequest): Promise<Record<string, unknown>> {
    const response = await this.call('GetAppWishlistReporting', {
      appid: request.appid,
      date: request.date,
    });

    return {
      query: request,
      response,
    };
  }

  private async call(methodName: string, params: Record<string, string | number | boolean | undefined>): Promise<unknown> {
    const financialKey = resolveFinancialKey(this.options.financialKey);

    if (!financialKey) {
      throw new SteamMcpError({
        code: 'authorization_required',
        message: 'This Steam partner financial method requires STEAM_FINANCIAL_KEY.',
      });
    }

    const url = new URL(`https://partner.steam-api.com/IPartnerFinancialsService/${methodName}/v001/`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', financialKey);

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

function resolveFinancialKey(financialKey: string | (() => string | undefined) | undefined): string | undefined {
  return typeof financialKey === 'function' ? financialKey() : financialKey;
}
