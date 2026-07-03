import { z } from 'zod';

import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

const newsForAppResponseSchema = z
  .object({
    appnews: z
      .object({
        appid: z.number().optional(),
        newsitems: z.array(z.unknown()).default([]),
        count: z.number().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const currentPlayersResponseSchema = z
  .object({
    response: z
      .object({
        result: z.number().optional(),
        player_count: z.number().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const achievementPercentagesResponseSchema = z
  .object({
    achievementpercentages: z
      .object({
        achievements: z.array(z.unknown()).default([]),
      })
      .passthrough(),
  })
  .passthrough();

const genericResponseEnvelopeSchema = z
  .object({
    response: z.record(z.unknown()).default({}),
  })
  .passthrough();

export type SteamWebApiClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  webApiKey?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export type GetNewsForAppRequest = {
  appid: number;
  count?: number;
  endDate?: number;
  feeds?: string;
  maxLength?: number;
  tags?: string;
};

export type GetCurrentPlayersRequest = {
  appid: number;
};

export type GetGlobalAchievementPercentagesRequest = {
  appid: number;
};

export type GetServersAtAddressRequest = {
  address: string;
};

export type UpToDateCheckRequest = {
  appid: number;
  version: number;
};

export type GetGlobalStatsForGameRequest = {
  appid: number;
  statNames: string[];
  startDate?: number;
  endDate?: number;
};

export type GetSchemaForGameRequest = {
  appid: number;
  language?: string;
};

export type GetStoreAppListRequest = {
  ifModifiedSince?: number;
  haveDescriptionLanguage?: string;
  includeGames?: boolean;
  includeDlc?: boolean;
  includeSoftware?: boolean;
  includeVideos?: boolean;
  includeHardware?: boolean;
  lastAppid?: number;
  maxResults?: number;
};

export type StoreSteamIdRequest = {
  steamId: string;
};

export type GetRecommendedTagsForUserRequest = {
  language: string;
  countryCode: string;
  favorRarerTags?: boolean;
};

export class SteamWebApiClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamWebApiClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getNewsForApp(request: GetNewsForAppRequest): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('appid', String(request.appid));

    setOptionalParam(url, 'count', request.count);
    setOptionalParam(url, 'enddate', request.endDate);
    setOptionalParam(url, 'feeds', request.feeds);
    setOptionalParam(url, 'maxlength', request.maxLength);
    setOptionalParam(url, 'tags', request.tags);

    const raw = await this.getCachedJson(url);
    const parsed = newsForAppResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidWebApiResponse('Steam news response did not match the expected schema.', parsed.error);
    }

    return {
      query: {
        appid: request.appid,
        count: request.count,
        endDate: request.endDate,
        feeds: request.feeds,
        maxLength: request.maxLength,
        tags: request.tags,
      },
      appid: parsed.data.appnews.appid ?? request.appid,
      count: parsed.data.appnews.count ?? parsed.data.appnews.newsitems.length,
      newsItems: parsed.data.appnews.newsitems,
    };
  }

  async getWebApiServerInfo(): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/ISteamWebAPIUtil/GetServerInfo/v1/');
    url.searchParams.set('format', 'json');

    const response = await this.getCachedJson(url);

    return {
      response,
    };
  }

  async getNumberOfCurrentPlayers(request: GetCurrentPlayersRequest): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('appid', String(request.appid));

    const raw = await this.getCachedJson(url);
    const parsed = currentPlayersResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidWebApiResponse('Steam current players response did not match the expected schema.', parsed.error);
    }

    if (parsed.data.response.result !== undefined && parsed.data.response.result !== 1) {
      throw new SteamMcpError({
        code: 'not_found',
        message: `Steam current player count not found for appid ${request.appid}.`,
      });
    }

    return {
      appid: request.appid,
      playerCount: parsed.data.response.player_count,
      result: parsed.data.response.result,
    };
  }

  async getGlobalAchievementPercentages(
    request: GetGlobalAchievementPercentagesRequest,
  ): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('gameid', String(request.appid));

    const raw = await this.getCachedJson(url);
    const parsed = achievementPercentagesResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidWebApiResponse('Steam global achievement percentages response did not match the expected schema.', parsed.error);
    }

    return {
      appid: request.appid,
      achievements: parsed.data.achievementpercentages.achievements,
      count: parsed.data.achievementpercentages.achievements.length,
    };
  }

  async getServersAtAddress(request: GetServersAtAddressRequest): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/ISteamApps/GetServersAtAddress/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('addr', request.address);

    const raw = await this.getCachedJson(url);
    const parsed = genericResponseEnvelopeSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidWebApiResponse('Steam server address response did not match the expected schema.', parsed.error);
    }

    return {
      address: request.address,
      response: parsed.data.response,
    };
  }

  async checkAppUpToDate(request: UpToDateCheckRequest): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/ISteamApps/UpToDateCheck/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('appid', String(request.appid));
    url.searchParams.set('version', String(request.version));

    const raw = await this.getCachedJson(url);
    const parsed = genericResponseEnvelopeSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidWebApiResponse('Steam app version response did not match the expected schema.', parsed.error);
    }

    return {
      query: {
        appid: request.appid,
        version: request.version,
      },
      response: parsed.data.response,
    };
  }

  async getGlobalStatsForGame(request: GetGlobalStatsForGameRequest): Promise<Record<string, unknown>> {
    const statNames = request.statNames.map((statName) => statName.trim()).filter((statName) => statName.length > 0);

    if (statNames.length === 0) {
      throw new SteamMcpError({
        code: 'validation_error',
        message: 'At least one stat name is required.',
      });
    }

    const url = new URL('https://api.steampowered.com/ISteamUserStats/GetGlobalStatsForGame/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('appid', String(request.appid));
    url.searchParams.set('count', String(statNames.length));
    statNames.forEach((statName, index) => url.searchParams.set(`name[${index}]`, statName));
    setOptionalParam(url, 'startdate', request.startDate);
    setOptionalParam(url, 'enddate', request.endDate);

    const raw = await this.getCachedJson(url);
    const parsed = genericResponseEnvelopeSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidWebApiResponse('Steam global stats response did not match the expected schema.', parsed.error);
    }

    return {
      query: {
        appid: request.appid,
        statNames,
        startDate: request.startDate,
        endDate: request.endDate,
      },
      response: parsed.data.response,
    };
  }

  async getSchemaForGame(request: GetSchemaForGameRequest): Promise<Record<string, unknown>> {
    const webApiKey = resolveWebApiKey(this.options.webApiKey);

    if (!webApiKey) {
      throw new SteamMcpError({
        code: 'authentication_required',
        message: 'This Steam Web API method requires STEAM_WEB_API_KEY.',
      });
    }

    const url = new URL('https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', webApiKey);
    url.searchParams.set('appid', String(request.appid));
    setOptionalParam(url, 'l', request.language);

    const raw = await this.getCachedJson(url);

    return {
      query: {
        appid: request.appid,
        language: request.language,
      },
      response: raw,
    };
  }

  async getStoreAppList(request: GetStoreAppListRequest): Promise<Record<string, unknown>> {
    const webApiKey = resolveWebApiKey(this.options.webApiKey);

    if (!webApiKey) {
      throw new SteamMcpError({
        code: 'authentication_required',
        message: 'This Steam Store Web API method requires STEAM_WEB_API_KEY.',
      });
    }

    const inputJson = removeUndefined({
      if_modified_since: request.ifModifiedSince,
      have_description_language: request.haveDescriptionLanguage,
      include_games: request.includeGames,
      include_dlc: request.includeDlc,
      include_software: request.includeSoftware,
      include_videos: request.includeVideos,
      include_hardware: request.includeHardware,
      last_appid: request.lastAppid,
      max_results: request.maxResults,
    });
    const url = new URL('https://partner.steam-api.com/IStoreService/GetAppList/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', webApiKey);
    url.searchParams.set('input_json', JSON.stringify(inputJson));

    const raw = await this.getCachedJson(url);
    const parsed = genericResponseEnvelopeSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidWebApiResponse('Steam Store app list response did not match the expected schema.', parsed.error);
    }

    return {
      query: request,
      response: parsed.data.response,
    };
  }

  async getGamesFollowed(request: StoreSteamIdRequest): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/IStoreService/GetGamesFollowed/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('steamid', request.steamId);

    const raw = await this.getCachedJson(url);
    const parsed = genericResponseEnvelopeSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidWebApiResponse('Steam followed games response did not match the expected schema.', parsed.error);
    }

    return {
      steamId: request.steamId,
      response: parsed.data.response,
    };
  }

  async getGamesFollowedCount(request: StoreSteamIdRequest): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/IStoreService/GetGamesFollowedCount/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('steamid', request.steamId);

    const raw = await this.getCachedJson(url);
    const parsed = genericResponseEnvelopeSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidWebApiResponse('Steam followed game count response did not match the expected schema.', parsed.error);
    }

    return {
      steamId: request.steamId,
      response: parsed.data.response,
    };
  }

  async getRecommendedTagsForUser(request: GetRecommendedTagsForUserRequest): Promise<Record<string, unknown>> {
    const webApiKey = resolveWebApiKey(this.options.webApiKey);

    if (!webApiKey) {
      throw new SteamMcpError({
        code: 'authentication_required',
        message: 'This Steam Store recommended tags method requires STEAM_WEB_API_KEY.',
      });
    }

    const url = new URL('https://api.steampowered.com/IStoreService/GetRecommendedTagsForUser/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', webApiKey);
    url.searchParams.set('language', request.language);
    url.searchParams.set('country_code', request.countryCode);
    url.searchParams.set('favor_rarer_tags', String(request.favorRarerTags ?? false));

    const raw = await this.getCachedJson(url);
    const parsed = genericResponseEnvelopeSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidWebApiResponse('Steam recommended tags response did not match the expected schema.', parsed.error);
    }

    return {
      query: {
        language: request.language,
        countryCode: request.countryCode,
        favorRarerTags: request.favorRarerTags ?? false,
      },
      response: parsed.data.response,
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

function setOptionalParam(url: URL, name: string, value: string | number | undefined): void {
  if (value !== undefined) {
    url.searchParams.set(name, String(value));
  }
}

function resolveWebApiKey(webApiKey: string | (() => string | undefined) | undefined): string | undefined {
  return typeof webApiKey === 'function' ? webApiKey() : webApiKey;
}

function removeUndefined(params: Record<string, string | number | boolean | undefined>): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};

  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) {
      result[name] = value;
    }
  }

  return result;
}

function invalidWebApiResponse(message: string, error: z.ZodError): SteamMcpError {
  return new SteamMcpError({
    code: 'upstream_error',
    message,
    details: {
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    },
  });
}
