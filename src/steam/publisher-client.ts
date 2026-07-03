import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

export type SteamPublisherClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'> & Partial<Pick<HttpJsonClient, 'postFormJson'>>;
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

export type PublisherWorkshopItemRequest = {
  appid: number;
  gameItemId: number;
};

export type LeaderboardDataRequest = 'RequestGlobal' | 'RequestAroundUser' | 'RequestFriends';

export type LeaderboardEntriesRequest = PublisherAppRequest & {
  leaderboardId: number;
  rangeStart: number;
  rangeEnd: number;
  dataRequest: LeaderboardDataRequest;
  steamId?: string;
};

export type GameServerPlayerStatsRequest = PublisherAppRequest & {
  gameId: string;
  rangeStart: string;
  rangeEnd: string;
  maxResults?: number;
};

export type EnumerateUserSubscribedFilesRequest = PublisherSteamAppRequest & {
  listType: number;
};

export type PublishedItemSearchType = 'publicationOrder' | 'trend' | 'vote';

export type PublishedItemSearchRequest = PublisherSteamAppRequest & {
  searchType: PublishedItemSearchType;
  startIndex?: number;
  count?: number;
  tags?: string[];
  userTags?: string[];
  hasAppAdminAccess?: boolean;
  fileType?: number;
  days?: number;
};

export type PublishedItemSearchSummaryRequest = PublisherSteamAppRequest & {
  tags?: string[];
  userTags?: string[];
  hasAppAdminAccess?: boolean;
  fileType?: number;
};

export type PublishedItemVoteSummaryRequest = PublisherSteamAppRequest & {
  publishedFileIds: string[];
};

export type UserPublishedItemVoteSummaryRequest = PublisherSteamIdRequest & {
  publishedFileIds: string[];
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

  async getWorkshopFinalizedContributors(request: PublisherWorkshopItemRequest): Promise<Record<string, unknown>> {
    return this.call('IWorkshopService', 'GetFinalizedContributors', 1, {
      appid: request.appid,
      gameitemid: request.gameItemId,
    });
  }

  async getLeaderboardsForGame(request: PublisherAppRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamLeaderboards', 'GetLeaderboardsForGame', 2, {
      appid: request.appid,
    });
  }

  async getLeaderboardEntries(request: LeaderboardEntriesRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamLeaderboards', 'GetLeaderboardEntries', 1, {
      appid: request.appid,
      leaderboardid: request.leaderboardId,
      rangestart: request.rangeStart,
      rangeend: request.rangeEnd,
      datarequest: request.dataRequest,
      steamid: request.steamId,
    });
  }

  async getGameServerPlayerStats(request: GameServerPlayerStatsRequest): Promise<Record<string, unknown>> {
    return this.call('ISteamGameServerStats', 'GetGameServerPlayerStatsForGame', 1, {
      gameid: request.gameId,
      appid: request.appid,
      rangestart: request.rangeStart,
      rangeend: request.rangeEnd,
      maxresults: request.maxResults,
    });
  }

  async enumerateUserSubscribedFiles(request: EnumerateUserSubscribedFilesRequest): Promise<Record<string, unknown>> {
    return this.postForm('ISteamRemoteStorage', 'EnumerateUserSubscribedFiles', 1, {
      steamid: request.steamId,
      appid: request.appid,
      listtype: request.listType,
    });
  }

  async searchPublishedItems(request: PublishedItemSearchRequest): Promise<Record<string, unknown>> {
    return this.postForm('ISteamPublishedItemSearch', mapPublishedItemSearchMethod(request.searchType), 1, {
      steamid: request.steamId,
      appid: request.appid,
      startidx: request.startIndex ?? 0,
      count: request.count ?? 20,
      tagcount: request.tags?.length ?? 0,
      usertagcount: request.userTags?.length ?? 0,
      hasappadminaccess: request.hasAppAdminAccess,
      fileType: request.fileType,
      days: request.days,
      tag: request.tags,
      usertag: request.userTags,
    });
  }

  async getPublishedItemSearchSummary(request: PublishedItemSearchSummaryRequest): Promise<Record<string, unknown>> {
    return this.postForm('ISteamPublishedItemSearch', 'ResultSetSummary', 1, {
      steamid: request.steamId,
      appid: request.appid,
      tagcount: request.tags?.length ?? 0,
      usertagcount: request.userTags?.length ?? 0,
      hasappadminaccess: request.hasAppAdminAccess,
      fileType: request.fileType,
      tag: request.tags,
      usertag: request.userTags,
    });
  }

  async getPublishedItemVoteSummary(request: PublishedItemVoteSummaryRequest): Promise<Record<string, unknown>> {
    const publishedFileIds = normalizePublishedFileIds(request.publishedFileIds);

    return this.postForm('ISteamPublishedItemVoting', 'ItemVoteSummary', 1, {
      steamid: request.steamId,
      appid: request.appid,
      count: publishedFileIds.length,
      publishedfileid: publishedFileIds,
    });
  }

  async getUserPublishedItemVoteSummary(request: UserPublishedItemVoteSummaryRequest): Promise<Record<string, unknown>> {
    const publishedFileIds = normalizePublishedFileIds(request.publishedFileIds);

    return this.postForm('ISteamPublishedItemVoting', 'UserVoteSummary', 1, {
      steamid: request.steamId,
      count: publishedFileIds.length,
      publishedfileid: publishedFileIds,
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

  private async postForm(
    interfaceName: string,
    methodName: string,
    version: number,
    params: Record<string, string | number | boolean | string[] | number[] | undefined>,
  ): Promise<Record<string, unknown>> {
    const publisherKey = resolvePublisherKey(this.options.publisherKey);

    if (!publisherKey) {
      throw new SteamMcpError({
        code: 'authorization_required',
        message: 'This Steam publisher Web API method requires STEAM_PUBLISHER_KEY.',
      });
    }

    if (!this.options.http.postFormJson) {
      throw new SteamMcpError({
        code: 'upstream_error',
        message: 'Publisher POST HTTP client is not configured.',
      });
    }

    const url = new URL(`https://partner.steam-api.com/${interfaceName}/${methodName}/v${version}/`);
    url.searchParams.set('format', 'json');

    const form = new URLSearchParams();
    form.set('key', publisherKey);

    for (const [name, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => form.set(`${name}[${index}]`, String(item)));
      } else if (value !== undefined) {
        form.set(name, String(value));
      }
    }

    const cacheKey = `${url.toString()}?${form.toString()}`;
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

    const response = await this.options.http.postFormJson<unknown>(url, form);
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

function mapPublishedItemSearchMethod(searchType: PublishedItemSearchType): string {
  switch (searchType) {
    case 'publicationOrder':
      return 'RankedByPublicationOrder';
    case 'trend':
      return 'RankedByTrend';
    case 'vote':
      return 'RankedByVote';
  }
}

function normalizePublishedFileIds(ids: string[]): string[] {
  const normalized = ids.map((id) => id.trim()).filter((id) => id.length > 0);

  if (normalized.length === 0) {
    throw new SteamMcpError({
      code: 'validation_error',
      message: 'At least one published file id is required.',
    });
  }

  return normalized;
}
