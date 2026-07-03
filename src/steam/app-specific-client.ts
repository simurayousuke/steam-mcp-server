import { TtlCache } from '../common/cache.js';
import type { HttpJsonClient } from '../common/http.js';

export type SteamAppSpecificClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  cacheTtlMs: number;
};

export type GetGcVersionRequest = {
  appid: number;
};

export type GetPortal2BucketizedLeaderboardRequest = {
  leaderboardName: string;
};

export class SteamAppSpecificClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamAppSpecificClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getGcClientVersion(request: GetGcVersionRequest): Promise<Record<string, unknown>> {
    const url = new URL(`https://api.steampowered.com/IGCVersion_${request.appid}/GetClientVersion/v1/`);
    url.searchParams.set('format', 'json');

    return {
      query: request,
      response: await this.getCachedJson(url),
    };
  }

  async getGcServerVersion(request: GetGcVersionRequest): Promise<Record<string, unknown>> {
    const url = new URL(`https://api.steampowered.com/IGCVersion_${request.appid}/GetServerVersion/v1/`);
    url.searchParams.set('format', 'json');

    return {
      query: request,
      response: await this.getCachedJson(url),
    };
  }

  async getPortal2LeaderboardBucketizedData(
    request: GetPortal2BucketizedLeaderboardRequest,
  ): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/IPortal2Leaderboards_620/GetBucketizedData/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('leaderboardName', request.leaderboardName);

    return {
      query: request,
      response: await this.getCachedJson(url),
    };
  }

  async getTf2WorldStatus(): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/ITFSystem_440/GetWorldStatus/v1/');
    url.searchParams.set('format', 'json');

    return {
      response: await this.getCachedJson(url),
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
