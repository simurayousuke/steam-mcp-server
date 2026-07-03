import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

export type SteamLobbyMatchmakingClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  publisherKey?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export type LobbyDataRequest = {
  appid: number;
  steamIdLobby: string;
};

export class SteamLobbyMatchmakingClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamLobbyMatchmakingClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getLobbyData(request: LobbyDataRequest): Promise<Record<string, unknown>> {
    const response = await this.callService('GetLobbyData', {
      appid: request.appid,
      steamid_lobby: request.steamIdLobby,
    });

    return {
      query: request,
      response,
    };
  }

  private async callService(methodName: string, input: Record<string, string | number>): Promise<unknown> {
    const publisherKey = resolvePublisherKey(this.options.publisherKey);

    if (!publisherKey) {
      throw new SteamMcpError({
        code: 'authorization_required',
        message: 'This Steam Lobby Matchmaking method requires STEAM_PUBLISHER_KEY.',
      });
    }

    const url = new URL(`https://partner.steam-api.com/ILobbyMatchmakingService/${methodName}/v1/`);
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

function resolvePublisherKey(publisherKey: string | (() => string | undefined) | undefined): string | undefined {
  return typeof publisherKey === 'function' ? publisherKey() : publisherKey;
}
