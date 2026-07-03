import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

export type SteamPublisherClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  publisherKey?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export type PublisherSteamAppRequest = {
  steamId: string;
  appid: number;
};

export type PublisherSteamIdRequest = {
  steamId: string;
};

export type AppPriceInfoRequest = PublisherSteamIdRequest & {
  appids: number[];
};

export type DeletedSteamIdsRequest = {
  rowVersion: string;
};

export type AuthenticateUserTicketRequest = {
  appid: number;
  ticket: string;
  identity?: string;
};

export class SteamPublisherClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamPublisherClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async checkAppOwnership(request: PublisherSteamAppRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamUser', 'CheckAppOwnership', 4, {
      steamid: request.steamId,
      appid: request.appid,
    });
  }

  async getPublisherAppOwnership(request: PublisherSteamIdRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamUser', 'GetPublisherAppOwnership', 4, {
      steamid: request.steamId,
    });
  }

  async getAppPriceInfo(request: AppPriceInfoRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamUser', 'GetAppPriceInfo', 1, {
      steamid: request.steamId,
      appids: request.appids.join(','),
    });
  }

  async getDeletedSteamIds(request: DeletedSteamIdsRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamUser', 'GetDeletedSteamIDs', 1, {
      rowversion: request.rowVersion,
    });
  }

  async getUserGroupList(request: PublisherSteamIdRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamUser', 'GetUserGroupList', 1, {
      steamid: request.steamId,
    });
  }

  async authenticateUserTicket(request: AuthenticateUserTicketRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamUserAuth', 'AuthenticateUserTicket', 1, {
      appid: request.appid,
      ticket: request.ticket,
      identity: request.identity,
    });
  }

  private async call(
    interfaceName: string,
    methodName: string,
    version: number,
    params: Record<string, string | number | boolean | undefined>,
  ): Promise<Record<string, unknown>> {
    const publisherKey = resolvePublisherKey(this.options.publisherKey);

    if (!publisherKey) {
      throw new SteamMcpError({
        code: 'authorization_required',
        message: 'This Steam publisher Web API method requires STEAM_PUBLISHER_KEY.',
      });
    }

    const url = new URL(`https://partner.steam-api.com/${interfaceName}/${methodName}/v${version}/`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', publisherKey);

    for (const [name, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(name, String(value));
      }
    }

    const cacheKey = url.toString();
    const cached = this.cache.get(cacheKey);

    if (cached !== undefined) {
      return {
        request: {
          interfaceName,
          methodName,
          version,
          cache: 'hit',
        },
        response: cached,
      };
    }

    const response = await this.options.http.getJson<unknown>(url);
    this.cache.set(cacheKey, response);

    return {
      request: {
        interfaceName,
        methodName,
        version,
        cache: 'miss',
      },
      response,
    };
  }
}

function resolvePublisherKey(publisherKey: string | (() => string | undefined) | undefined): string | undefined {
  return typeof publisherKey === 'function' ? publisherKey() : publisherKey;
}
