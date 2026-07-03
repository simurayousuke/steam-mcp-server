import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

export type SteamUserOAuthClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  oauthAccessToken?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export class SteamUserOAuthClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamUserOAuthClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getTokenDetails(): Promise<Record<string, unknown>> {
    const accessToken = resolveOAuthAccessToken(this.options.oauthAccessToken);

    if (!accessToken) {
      throw new SteamMcpError({
        code: 'authentication_required',
        message: 'This Steam OAuth token details method requires a session OAuth access token.',
      });
    }

    const url = new URL('https://api.steampowered.com/ISteamUserOAuth/GetTokenDetails/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('access_token', accessToken);

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

function resolveOAuthAccessToken(oauthAccessToken: string | (() => string | undefined) | undefined): string | undefined {
  return typeof oauthAccessToken === 'function' ? oauthAccessToken() : oauthAccessToken;
}
