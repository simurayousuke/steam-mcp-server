import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

export type SteamGameServersClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  webApiKey?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export type GameServerAccountPublicInfoRequest = {
  steamId: string;
};

export type ServerSteamIdsByIpRequest = {
  serverIps: string[];
};

export type ServerIpsBySteamIdRequest = {
  serverSteamIds: string[];
};

export class SteamGameServersClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamGameServersClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getAccountPublicInfo(request: GameServerAccountPublicInfoRequest): Promise<Record<string, unknown>> {
    const input = {
      steamid: request.steamId,
    };
    const response = await this.callService('GetAccountPublicInfo', input);

    return {
      query: {
        steamId: request.steamId,
      },
      response,
    };
  }

  async getServerSteamIdsByIp(request: ServerSteamIdsByIpRequest): Promise<Record<string, unknown>> {
    const serverIps = normalizeNonEmptyList(request.serverIps, 'At least one server IP is required.');
    const input = {
      server_ips: serverIps.join(','),
    };
    const response = await this.callService('GetServerSteamIDsByIP', input);

    return {
      query: {
        serverIps,
      },
      response,
    };
  }

  async getServerIpsBySteamId(request: ServerIpsBySteamIdRequest): Promise<Record<string, unknown>> {
    const serverSteamIds = normalizeNonEmptyList(request.serverSteamIds, 'At least one server SteamID is required.');
    const input = {
      server_steamids: serverSteamIds.join(','),
    };
    const response = await this.callService('GetServerIPsBySteamID', input);

    return {
      query: {
        serverSteamIds,
      },
      response,
    };
  }

  private async callService(methodName: string, input: Record<string, string>): Promise<unknown> {
    const webApiKey = resolveWebApiKey(this.options.webApiKey);

    if (!webApiKey) {
      throw missingWebApiKey();
    }

    const url = new URL(`https://api.steampowered.com/IGameServersService/${methodName}/v1/`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', webApiKey);
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

function normalizeNonEmptyList(values: string[], message: string): string[] {
  const normalized = values.map((value) => value.trim()).filter((value) => value.length > 0);

  if (normalized.length === 0) {
    throw new SteamMcpError({
      code: 'validation_error',
      message,
    });
  }

  return normalized;
}

function resolveWebApiKey(webApiKey: string | (() => string | undefined) | undefined): string | undefined {
  return typeof webApiKey === 'function' ? webApiKey() : webApiKey;
}

function missingWebApiKey(): SteamMcpError {
  return new SteamMcpError({
    code: 'authentication_required',
    message: 'This Steam Game Servers Web API method requires STEAM_WEB_API_KEY.',
  });
}
