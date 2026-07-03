import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

export type SteamCloudClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  oauthAccessToken?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export type EnumerateUserFilesRequest = {
  appid: number;
  extendedDetails?: boolean;
  count?: number;
  startIndex?: number;
};

export class SteamCloudClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamCloudClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async enumerateUserFiles(request: EnumerateUserFilesRequest): Promise<Record<string, unknown>> {
    const accessToken = resolveOAuthAccessToken(this.options.oauthAccessToken);

    if (!accessToken) {
      throw new SteamMcpError({
        code: 'authentication_required',
        message: 'Steam Cloud access requires a Steam OAuth access token with read_cloud permission.',
      });
    }

    const url = new URL('https://api.steampowered.com/ICloudService/EnumerateUserFiles/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('appid', String(request.appid));
    setOptionalParam(url, 'extended_details', boolParam(request.extendedDetails));
    setOptionalParam(url, 'count', request.count);
    setOptionalParam(url, 'start_index', request.startIndex);

    const response = await this.getCachedJson(url);

    return {
      query: request,
      response,
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

function resolveOAuthAccessToken(accessToken: string | (() => string | undefined) | undefined): string | undefined {
  return typeof accessToken === 'function' ? accessToken() : accessToken;
}

function setOptionalParam(url: URL, name: string, value: string | number | undefined): void {
  if (value !== undefined) {
    url.searchParams.set(name, String(value));
  }
}

function boolParam(value: boolean | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value ? '1' : '0';
}
