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

export type SteamWebApiClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
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
