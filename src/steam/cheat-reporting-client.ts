import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

export type SteamCheatReportingClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  publisherKey?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export type CheatingReportsRequest = {
  appid: number;
  timeBegin: number;
  timeEnd: number;
  reportIdMin: string;
  includeReports?: boolean;
  includeBans?: boolean;
  steamId?: string;
};

export class SteamCheatReportingClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamCheatReportingClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getCheatingReports(request: CheatingReportsRequest): Promise<Record<string, unknown>> {
    const includeReports = request.includeReports ?? true;
    const includeBans = request.includeBans ?? true;

    if (!includeReports && !includeBans) {
      throw new SteamMcpError({
        code: 'validation_error',
        message: 'At least one of includeReports or includeBans must be true.',
      });
    }

    const response = await this.callService('GetCheatingReports', {
      appid: request.appid,
      timebegin: request.timeBegin,
      timeend: request.timeEnd,
      reportidmin: request.reportIdMin,
      includereports: includeReports,
      includebans: includeBans,
      steamid: request.steamId,
    });

    return {
      query: {
        ...request,
        includeReports,
        includeBans,
      },
      response,
    };
  }

  private async callService(methodName: string, input: Record<string, string | number | boolean | undefined>): Promise<unknown> {
    const publisherKey = resolvePublisherKey(this.options.publisherKey);

    if (!publisherKey) {
      throw new SteamMcpError({
        code: 'authorization_required',
        message: 'This Steam Cheat Reporting method requires STEAM_PUBLISHER_KEY.',
      });
    }

    const url = new URL(`https://partner.steam-api.com/ICheatReportingService/${methodName}/v1/`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', publisherKey);
    url.searchParams.set('input_json', JSON.stringify(removeUndefined(input)));

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
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));
}

function resolvePublisherKey(publisherKey: string | (() => string | undefined) | undefined): string | undefined {
  return typeof publisherKey === 'function' ? publisherKey() : publisherKey;
}
