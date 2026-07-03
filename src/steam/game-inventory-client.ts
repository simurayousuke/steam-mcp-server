import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

export type SteamGameInventoryClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  publisherKey?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export type HistoryCommandDetailsRequest = {
  appid: number;
  steamId: string;
  command: string;
  contextId: string;
  commandArguments: string;
};

export type UserHistoryRequest = {
  appid: number;
  steamId: string;
  contextId: string;
  startTime: number;
  endTime: number;
};

export type AssetHistoryRequest = {
  appid: number;
  assetId: string;
  contextId: string;
};

export class SteamGameInventoryClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamGameInventoryClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getHistoryCommandDetails(request: HistoryCommandDetailsRequest): Promise<Record<string, unknown>> {
    const response = await this.call('GetHistoryCommandDetails', {
      appid: request.appid,
      steamid: request.steamId,
      command: request.command,
      contextid: request.contextId,
      arguments: request.commandArguments,
    });

    return {
      query: request,
      response,
    };
  }

  async getUserHistory(request: UserHistoryRequest): Promise<Record<string, unknown>> {
    const response = await this.call('GetUserHistory', {
      appid: request.appid,
      steamid: request.steamId,
      contextid: request.contextId,
      starttime: request.startTime,
      endtime: request.endTime,
    });

    return {
      query: request,
      response,
    };
  }

  async supportGetAssetHistory(request: AssetHistoryRequest): Promise<Record<string, unknown>> {
    const response = await this.call('SupportGetAssetHistory', {
      appid: request.appid,
      assetid: request.assetId,
      contextid: request.contextId,
    });

    return {
      query: request,
      response,
    };
  }

  private async call(methodName: string, params: Record<string, string | number | undefined>): Promise<unknown> {
    const publisherKey = resolvePublisherKey(this.options.publisherKey);

    if (!publisherKey) {
      throw new SteamMcpError({
        code: 'authorization_required',
        message: 'This Steam Game Inventory method requires STEAM_PUBLISHER_KEY.',
      });
    }

    const url = new URL(`https://partner.steam-api.com/IGameInventory/${methodName}/v1/`);
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
