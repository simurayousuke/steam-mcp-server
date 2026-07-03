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

export type SteamWorkshopClientOptions = {
  http: Pick<HttpJsonClient, 'postFormJson'>;
  cacheTtlMs: number;
};

export type WorkshopFileDetailsRequest = {
  publishedFileIds: string[];
};

export type WorkshopCollectionDetailsRequest = {
  publishedFileIds: string[];
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
