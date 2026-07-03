import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

export type SteamPlayerClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  webApiKey?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export type ResolveVanityUrlRequest = {
  vanityName: string;
  urlType?: number;
};

export type SteamIdRequest = {
  steamId: string;
};

export type SteamIdsRequest = {
  steamIds: string[];
};

export type OwnedGamesRequest = SteamIdRequest & {
  appidsFilter?: number[];
  includeAppInfo?: boolean;
  includePlayedFreeGames?: boolean;
};

export type RecentlyPlayedGamesRequest = SteamIdRequest & {
  count?: number;
};

export type SingleGamePlaytimeRequest = SteamIdRequest & {
  appid: number;
};

export type FriendListRequest = SteamIdRequest & {
  relationship?: string;
};

export type CommunityBadgeProgressRequest = SteamIdRequest & {
  badgeid: number;
};

export type PlayerBansRequest = {
  steamIds: string[];
};

export type PlayerGameRequest = SteamIdRequest & {
  appid: number;
  language?: string;
};

export class SteamPlayerClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamPlayerClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async resolveVanityUrl(request: ResolveVanityUrlRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamUser', 'ResolveVanityURL', 1, {
      vanityurl: request.vanityName,
      url_type: request.urlType,
    });
  }

  async getPlayerSummary(request: SteamIdRequest): Promise<Record<string, unknown>> {
    return this.getPlayerSummaries({
      steamIds: [request.steamId],
    });
  }

  async getPlayerSummaries(request: SteamIdsRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamUser', 'GetPlayerSummaries', 2, {
      steamids: request.steamIds.join(','),
    });
  }

  async getOwnedGames(request: OwnedGamesRequest): Promise<Record<string, unknown>> {
    return this.call('IPlayerService', 'GetOwnedGames', 1, {
      steamid: request.steamId,
      include_appinfo: request.includeAppInfo ?? true,
      include_played_free_games: request.includePlayedFreeGames ?? true,
      appids_filter: request.appidsFilter,
    });
  }

  async getRecentlyPlayedGames(request: RecentlyPlayedGamesRequest): Promise<Record<string, unknown>> {
    return this.call('IPlayerService', 'GetRecentlyPlayedGames', 1, {
      steamid: request.steamId,
      count: request.count,
    });
  }

  async getSingleGamePlaytime(request: SingleGamePlaytimeRequest): Promise<Record<string, unknown>> {
    return this.call('IPlayerService', 'GetSingleGamePlaytime', 1, {
      steamid: request.steamId,
      appid: request.appid,
    });
  }

  async getSteamLevel(request: SteamIdRequest): Promise<Record<string, unknown>> {
    return this.call('IPlayerService', 'GetSteamLevel', 1, {
      steamid: request.steamId,
    });
  }

  async getBadges(request: SteamIdRequest): Promise<Record<string, unknown>> {
    return this.call('IPlayerService', 'GetBadges', 1, {
      steamid: request.steamId,
    });
  }

  async getCommunityBadgeProgress(request: CommunityBadgeProgressRequest): Promise<Record<string, unknown>> {
    return this.call('IPlayerService', 'GetCommunityBadgeProgress', 1, {
      steamid: request.steamId,
      badgeid: request.badgeid,
    });
  }

  async getFriendList(request: FriendListRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamUser', 'GetFriendList', 1, {
      steamid: request.steamId,
      relationship: request.relationship,
    });
  }

  async getPlayerBans(request: PlayerBansRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamUser', 'GetPlayerBans', 1, {
      steamids: request.steamIds.join(','),
    });
  }

  async getPlayerAchievements(request: PlayerGameRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamUserStats', 'GetPlayerAchievements', 1, {
      steamid: request.steamId,
      appid: request.appid,
      l: request.language,
    });
  }

  async getUserStatsForGame(request: PlayerGameRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamUserStats', 'GetUserStatsForGame', 2, {
      steamid: request.steamId,
      appid: request.appid,
      l: request.language,
    });
  }

  private async call(
    interfaceName: string,
    methodName: string,
    version: number,
    params: Record<string, string | number | boolean | number[] | undefined>,
  ): Promise<Record<string, unknown>> {
    const webApiKey = resolveWebApiKey(this.options.webApiKey);

    if (!webApiKey) {
      throw new SteamMcpError({
        code: 'authentication_required',
        message: 'This Steam Web API method requires STEAM_WEB_API_KEY.',
      });
    }

    const url = new URL(`https://api.steampowered.com/${interfaceName}/${methodName}/v${version}/`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', webApiKey);

    for (const [name, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => url.searchParams.set(`${name}[${index}]`, String(item)));
      } else if (value !== undefined) {
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

function resolveWebApiKey(webApiKey: string | (() => string | undefined) | undefined): string | undefined {
  return typeof webApiKey === 'function' ? webApiKey() : webApiKey;
}
