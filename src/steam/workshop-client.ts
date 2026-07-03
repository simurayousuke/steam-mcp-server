import { z } from 'zod';

import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

const publishedFileDetailsResponseSchema = z
  .object({
    response: z
      .object({
        result: z.number().optional(),
        resultcount: z.number().optional(),
        publishedfiledetails: z.array(z.unknown()).default([]),
      })
      .passthrough(),
  })
  .passthrough();

const collectionDetailsResponseSchema = z
  .object({
    response: z
      .object({
        result: z.number().optional(),
        resultcount: z.number().optional(),
        collectiondetails: z.array(z.unknown()).default([]),
      })
      .passthrough(),
  })
  .passthrough();

const queryFilesResponseSchema = z
  .object({
    response: z.record(z.unknown()).default({}),
  })
  .passthrough();

export type SteamWorkshopClientOptions = {
  http: Pick<HttpJsonClient, 'getJson' | 'postFormJson'>;
  webApiKey?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export type WorkshopFileDetailsRequest = {
  publishedFileIds: string[];
};

export type WorkshopCollectionDetailsRequest = {
  publishedFileIds: string[];
};

export type UgcFileDetailsRequest = {
  ugcId: string;
  appid: number;
  steamId?: string;
};

export type WorkshopRequiredKvTag = {
  key: string;
  value: string;
};

export type WorkshopQueryFilesRequest = {
  queryType: number;
  page?: number;
  cursor?: string;
  numPerPage?: number;
  creatorAppid: number;
  appid: number;
  requiredTags?: string;
  excludedTags?: string;
  matchAllTags?: boolean;
  requiredFlags?: string;
  omittedFlags?: string;
  searchText?: string;
  fileType?: number;
  childPublishedFileId?: string;
  days?: number;
  includeRecentVotesOnly?: boolean;
  cacheMaxAgeSeconds?: number;
  language?: number;
  requiredKvTags?: WorkshopRequiredKvTag[];
  totalOnly?: boolean;
  idsOnly?: boolean;
  returnVoteData?: boolean;
  returnTags?: boolean;
  returnKvTags?: boolean;
  returnPreviews?: boolean;
  returnChildren?: boolean;
  returnShortDescription?: boolean;
  returnForSaleData?: boolean;
  returnMetadata?: boolean;
  returnPlaytimeStats?: number;
};

export class SteamWorkshopClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamWorkshopClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getPublishedFileDetails(request: WorkshopFileDetailsRequest): Promise<Record<string, unknown>> {
    const ids = normalizePublishedFileIds(request.publishedFileIds);
    const form = new URLSearchParams();
    form.set('itemcount', String(ids.length));
    ids.forEach((id, index) => form.set(`publishedfileids[${index}]`, id));

    const raw = await this.postCachedJson(
      new URL('https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/'),
      form,
    );
    const parsed = publishedFileDetailsResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidWorkshopResponse('Steam published file details response did not match the expected schema.', parsed.error);
    }

    return {
      query: {
        publishedFileIds: ids,
      },
      result: parsed.data.response.result,
      resultCount: parsed.data.response.resultcount,
      details: parsed.data.response.publishedfiledetails,
    };
  }

  async getCollectionDetails(request: WorkshopCollectionDetailsRequest): Promise<Record<string, unknown>> {
    const ids = normalizePublishedFileIds(request.publishedFileIds);
    const form = new URLSearchParams();
    form.set('collectioncount', String(ids.length));
    ids.forEach((id, index) => form.set(`publishedfileids[${index}]`, id));

    const raw = await this.postCachedJson(
      new URL('https://api.steampowered.com/ISteamRemoteStorage/GetCollectionDetails/v1/'),
      form,
    );
    const parsed = collectionDetailsResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidWorkshopResponse('Steam collection details response did not match the expected schema.', parsed.error);
    }

    return {
      query: {
        publishedFileIds: ids,
      },
      result: parsed.data.response.result,
      resultCount: parsed.data.response.resultcount,
      details: parsed.data.response.collectiondetails,
    };
  }

  async getUgcFileDetails(request: UgcFileDetailsRequest): Promise<Record<string, unknown>> {
    const webApiKey = resolveWebApiKey(this.options.webApiKey);

    if (!webApiKey) {
      throw new SteamMcpError({
        code: 'authentication_required',
        message: 'This Steam UGC Web API method requires STEAM_WEB_API_KEY.',
      });
    }

    const url = new URL('https://api.steampowered.com/ISteamRemoteStorage/GetUGCFileDetails/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', webApiKey);
    url.searchParams.set('ugcid', request.ugcId);
    url.searchParams.set('appid', String(request.appid));

    if (request.steamId !== undefined) {
      url.searchParams.set('steamid', request.steamId);
    }

    const response = await this.getCachedJson(url);

    return {
      query: request,
      response,
    };
  }

  async queryFiles(request: WorkshopQueryFilesRequest): Promise<Record<string, unknown>> {
    const webApiKey = resolveWebApiKey(this.options.webApiKey);

    if (!webApiKey) {
      throw new SteamMcpError({
        code: 'authentication_required',
        message: 'This Steam Workshop Web API method requires STEAM_WEB_API_KEY.',
      });
    }

    const inputJson = removeUndefined({
      query_type: request.queryType,
      page: request.page,
      cursor: request.cursor,
      numperpage: request.numPerPage,
      creator_appid: request.creatorAppid,
      appid: request.appid,
      requiredtags: request.requiredTags,
      excludedtags: request.excludedTags,
      match_all_tags: request.matchAllTags,
      required_flags: request.requiredFlags,
      omitted_flags: request.omittedFlags,
      search_text: request.searchText,
      filetype: request.fileType,
      child_publishedfileid: request.childPublishedFileId,
      days: request.days,
      include_recent_votes_only: request.includeRecentVotesOnly,
      cache_max_age_seconds: request.cacheMaxAgeSeconds,
      language: request.language,
      required_kv_tags: request.requiredKvTags,
      totalonly: request.totalOnly,
      ids_only: request.idsOnly,
      return_vote_data: request.returnVoteData,
      return_tags: request.returnTags,
      return_kv_tags: request.returnKvTags,
      return_previews: request.returnPreviews,
      return_children: request.returnChildren,
      return_short_description: request.returnShortDescription,
      return_for_sale_data: request.returnForSaleData,
      return_metadata: request.returnMetadata,
      return_playtime_stats: request.returnPlaytimeStats,
    });
    const url = new URL('https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', webApiKey);
    url.searchParams.set('input_json', JSON.stringify(inputJson));

    const raw = await this.getCachedJson(url);
    const parsed = queryFilesResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidWorkshopResponse('Steam Workshop query response did not match the expected schema.', parsed.error);
    }

    return {
      query: request,
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

  private async postCachedJson(url: URL, form: URLSearchParams): Promise<unknown> {
    const cacheKey = `${url.toString()}?${form.toString()}`;
    const cached = this.cache.get(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const raw = await this.options.http.postFormJson<unknown>(url, form);
    this.cache.set(cacheKey, raw);
    return raw;
  }
}

function resolveWebApiKey(webApiKey: string | (() => string | undefined) | undefined): string | undefined {
  return typeof webApiKey === 'function' ? webApiKey() : webApiKey;
}

function removeUndefined(params: Record<string, unknown | undefined>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) {
      result[name] = value;
    }
  }

  return result;
}

function normalizePublishedFileIds(ids: string[]): string[] {
  const normalized = ids.map((id) => id.trim()).filter((id) => id.length > 0);

  if (normalized.length === 0) {
    throw new SteamMcpError({
      code: 'validation_error',
      message: 'At least one published file id is required.',
    });
  }

  if (normalized.length > 100) {
    throw new SteamMcpError({
      code: 'validation_error',
      message: 'Steam published file detail requests are limited to 100 ids per call.',
    });
  }

  return normalized;
}

function invalidWorkshopResponse(message: string, error: z.ZodError): SteamMcpError {
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
