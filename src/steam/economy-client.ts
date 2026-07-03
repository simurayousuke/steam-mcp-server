import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

export type SteamEconomyClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  webApiKey?: string | (() => string | undefined);
  publisherKey?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export type AssetClass = {
  classId: string;
  instanceId?: string;
};

export type AssetClassInfoRequest = {
  appid: number;
  language?: string;
  assetClasses: AssetClass[];
};

export type AssetPricesRequest = {
  appid: number;
  currency?: string;
  language?: string;
};

export type CanTradeRequest = {
  appid: number;
  steamId: string;
  targetId: string;
};

export type ExportedAssetsForUserRequest = {
  steamId: string;
  appid: number;
  contextId: string;
};

export type MarketPricesRequest = {
  appid: number;
};

export class SteamEconomyClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamEconomyClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getAssetClassInfo(request: AssetClassInfoRequest): Promise<Record<string, unknown>> {
    const webApiKey = resolveWebApiKey(this.options.webApiKey);

    if (!webApiKey) {
      throw missingWebApiKey();
    }

    const assetClasses = normalizeAssetClasses(request.assetClasses);
    const url = new URL('https://api.steampowered.com/ISteamEconomy/GetAssetClassInfo/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', webApiKey);
    url.searchParams.set('appid', String(request.appid));
    url.searchParams.set('class_count', String(assetClasses.length));
    setOptionalParam(url, 'language', request.language);
    assetClasses.forEach((assetClass, index) => {
      url.searchParams.set(`classid${index}`, assetClass.classId);
      setOptionalParam(url, `instanceid${index}`, assetClass.instanceId);
    });

    const response = await this.getCachedJson(url);

    return {
      query: {
        appid: request.appid,
        language: request.language,
        assetClasses,
      },
      response,
    };
  }

  async getAssetPrices(request: AssetPricesRequest): Promise<Record<string, unknown>> {
    const webApiKey = resolveWebApiKey(this.options.webApiKey);

    if (!webApiKey) {
      throw missingWebApiKey();
    }

    const url = new URL('https://api.steampowered.com/ISteamEconomy/GetAssetPrices/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', webApiKey);
    url.searchParams.set('appid', String(request.appid));
    setOptionalParam(url, 'currency', request.currency);
    setOptionalParam(url, 'language', request.language);

    const response = await this.getCachedJson(url);

    return {
      query: request,
      response,
    };
  }

  async canTrade(request: CanTradeRequest): Promise<Record<string, unknown>> {
    const response = await this.callPublisher('CanTrade', {
      appid: request.appid,
      steamid: request.steamId,
      targetid: request.targetId,
    });

    return {
      query: request,
      response,
    };
  }

  async getExportedAssetsForUser(request: ExportedAssetsForUserRequest): Promise<Record<string, unknown>> {
    const response = await this.callPublisher('GetExportedAssetsForUser', {
      steamid: request.steamId,
      appid: request.appid,
      contextid: request.contextId,
    });

    return {
      query: request,
      response,
    };
  }

  async getMarketPrices(request: MarketPricesRequest): Promise<Record<string, unknown>> {
    const response = await this.callPublisher('GetMarketPrices', {
      appid: request.appid,
    });

    return {
      query: request,
      response,
    };
  }

  private async callPublisher(
    methodName: string,
    params: Record<string, string | number | undefined>,
  ): Promise<unknown> {
    const publisherKey = resolvePublisherKey(this.options.publisherKey);

    if (!publisherKey) {
      throw missingPublisherKey();
    }

    const url = new URL(`https://partner.steam-api.com/ISteamEconomy/${methodName}/v1/`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', publisherKey);

    for (const [name, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(name, String(value));
      }
    }

    return this.getCachedJson(url);
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

function normalizeAssetClasses(assetClasses: AssetClass[]): AssetClass[] {
  const normalized = assetClasses.map((assetClass) => ({
    classId: assetClass.classId.trim(),
    instanceId: assetClass.instanceId?.trim(),
  }));

  if (normalized.some((assetClass) => assetClass.classId.length === 0)) {
    throw new SteamMcpError({
      code: 'validation_error',
      message: 'Every Steam asset class requires a classId.',
    });
  }

  return normalized;
}

function setOptionalParam(url: URL, name: string, value: string | undefined): void {
  if (value !== undefined) {
    url.searchParams.set(name, value);
  }
}

function resolveWebApiKey(webApiKey: string | (() => string | undefined) | undefined): string | undefined {
  return typeof webApiKey === 'function' ? webApiKey() : webApiKey;
}

function resolvePublisherKey(publisherKey: string | (() => string | undefined) | undefined): string | undefined {
  return typeof publisherKey === 'function' ? publisherKey() : publisherKey;
}

function missingWebApiKey(): SteamMcpError {
  return new SteamMcpError({
    code: 'authentication_required',
    message: 'This Steam Economy Web API method requires STEAM_WEB_API_KEY.',
  });
}

function missingPublisherKey(): SteamMcpError {
  return new SteamMcpError({
    code: 'authorization_required',
    message: 'This Steam Economy publisher method requires STEAM_PUBLISHER_KEY.',
  });
}
