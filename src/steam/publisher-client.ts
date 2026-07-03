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

export type PublisherAppRequest = {
  appid: number;
};

export type PublisherAppBuildsRequest = PublisherAppRequest & {
  count?: number;
};

export type PartnerAppListRequest = {
  typeFilter?: string[];
};

export type PublisherServerListRequest = {
  filter?: string;
  limit?: number;
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

  async getAppBetas(request: PublisherAppRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamApps', 'GetAppBetas', 1, {
      appid: request.appid,
    });
  }

  async getAppBuilds(request: PublisherAppBuildsRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamApps', 'GetAppBuilds', 1, {
      appid: request.appid,
      count: request.count,
    });
  }

  async getAppDepotVersions(request: PublisherAppRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamApps', 'GetAppDepotVersions', 1, {
      appid: request.appid,
    });
  }

  async getPartnerAppList(request: PartnerAppListRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamApps', 'GetPartnerAppListForWebAPIKey', 2, {
      type_filter: request.typeFilter?.join(','),
    });
  }

  async getPlayersBanned(request: PublisherAppRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamApps', 'GetPlayersBanned', 1, {
      appid: request.appid,
    });
  }

  async getServerList(request: PublisherServerListRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamApps', 'GetServerList', 1, {
      filter: request.filter,
      limit: request.limit,
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
