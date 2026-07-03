import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

export type SteamGameNotificationsClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  publisherKey?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export type EnumerateGameNotificationSessionsRequest = {
  steamId: string;
  appid?: number;
  includeAllUserMessages?: boolean;
  includeAuthUserMessage?: boolean;
  language?: string;
};

export type GameNotificationSessionDetailsRequest = {
  appid: number;
  sessionIds: string[];
  includeAllUserMessages?: boolean;
  language?: string;
};

export class SteamGameNotificationsClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamGameNotificationsClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async enumerateSessionsForApp(request: EnumerateGameNotificationSessionsRequest): Promise<Record<string, unknown>> {
    const input = compactInput({
      steamid: request.steamId,
      appid: request.appid,
      include_all_user_messages: request.includeAllUserMessages,
      include_auth_user_message: request.includeAuthUserMessage,
      language: request.language,
    });
    const response = await this.callService('EnumerateSessionsForApp', input);

    return {
      query: request,
      response,
    };
  }

  async getSessionDetailsForApp(request: GameNotificationSessionDetailsRequest): Promise<Record<string, unknown>> {
    const sessionIds = normalizeSessionIds(request.sessionIds);
    const input = compactInput({
      appid: request.appid,
      language: request.language,
      sessions: sessionIds.map((sessionid) =>
        compactInput({
          sessionid,
          include_all_user_messages: request.includeAllUserMessages,
        }),
      ),
    });
    const response = await this.callService('GetSessionDetailsForApp', input);

    return {
      query: {
        appid: request.appid,
        sessionIds,
        includeAllUserMessages: request.includeAllUserMessages,
        language: request.language,
      },
      response,
    };
  }

  private async callService(methodName: string, input: Record<string, unknown>): Promise<unknown> {
    const publisherKey = resolvePublisherKey(this.options.publisherKey);

    if (!publisherKey) {
      throw new SteamMcpError({
        code: 'authorization_required',
        message: 'This Steam Game Notifications method requires STEAM_PUBLISHER_KEY.',
      });
    }

    const url = new URL(`https://partner.steam-api.com/IGameNotificationsService/${methodName}/v1/`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', publisherKey);
    url.searchParams.set('input_json', JSON.stringify(input));

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

function normalizeSessionIds(sessionIds: string[]): string[] {
  const normalized = sessionIds.map((sessionId) => sessionId.trim()).filter((sessionId) => sessionId.length > 0);

  if (normalized.length === 0) {
    throw new SteamMcpError({
      code: 'validation_error',
      message: 'At least one game notification session id is required.',
    });
  }

  return normalized;
}

function compactInput(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function resolvePublisherKey(publisherKey: string | (() => string | undefined) | undefined): string | undefined {
  return typeof publisherKey === 'function' ? publisherKey() : publisherKey;
}
