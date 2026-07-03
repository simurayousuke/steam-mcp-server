import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

export type SteamSiteLicenseClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  publisherKey?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export type CurrentClientConnectionsRequest = {
  siteId?: string;
};

export type TotalPlaytimeRequest = {
  startTime: string;
  endTime: string;
  siteId?: string;
};

export class SteamSiteLicenseClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamSiteLicenseClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getCurrentClientConnections(request: CurrentClientConnectionsRequest): Promise<Record<string, unknown>> {
    const response = await this.call('GetCurrentClientConnections', {
      siteid: request.siteId,
    });

    return {
      query: request,
      response,
    };
  }

  async getTotalPlaytime(request: TotalPlaytimeRequest): Promise<Record<string, unknown>> {
    const response = await this.call('GetTotalPlaytime', {
      start_time: request.startTime,
      end_time: request.endTime,
      siteid: request.siteId,
    });

    return {
      query: request,
      response,
    };
  }

  private async call(methodName: string, params: Record<string, string | undefined>): Promise<unknown> {
    const publisherKey = resolvePublisherKey(this.options.publisherKey);

    if (!publisherKey) {
      throw new SteamMcpError({
        code: 'authorization_required',
        message: 'This Steam Site License method requires STEAM_PUBLISHER_KEY.',
      });
    }

    const url = new URL(`https://api.steampowered.com/ISiteLicenseService/${methodName}/v1/`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', publisherKey);

    for (const [name, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(name, value);
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

function resolvePublisherKey(publisherKey: string | (() => string | undefined) | undefined): string | undefined {
  return typeof publisherKey === 'function' ? publisherKey() : publisherKey;
}
