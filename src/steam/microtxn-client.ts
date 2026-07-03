import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

export const steamMicroTxnReportTypes = [
  'GAMESALES',
  'STEAMSTORESALES',
  'SETTLEMENT',
  'CHARGEBACK',
  'SUBSCRIPTION',
] as const;

export type SteamMicroTxnReportType = (typeof steamMicroTxnReportTypes)[number];

export type SteamMicroTxnClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  publisherKey?: string | (() => string | undefined);
  cacheTtlMs: number;
};

export type MicroTxnReportRequest = {
  appid: number;
  time: string;
  type?: SteamMicroTxnReportType;
  maxResults?: number;
  sandbox?: boolean;
};

export type MicroTxnUserAgreementInfoRequest = {
  appid: number;
  steamId: string;
  sandbox?: boolean;
};

export type MicroTxnUserInfoRequest = {
  appid: number;
  steamId?: string;
  ipAddress?: string;
  sandbox?: boolean;
};

export type MicroTxnQueryTxnRequest = {
  appid: number;
  orderId?: string;
  transId?: string;
  sandbox?: boolean;
};

export class SteamMicroTxnClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamMicroTxnClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getReport(request: MicroTxnReportRequest): Promise<Record<string, unknown>> {
    const response = await this.call('GetReport', 5, request.sandbox, {
      appid: request.appid,
      type: request.type,
      time: request.time,
      maxresults: request.maxResults,
    });

    return {
      query: request,
      response,
    };
  }

  async getUserAgreementInfo(request: MicroTxnUserAgreementInfoRequest): Promise<Record<string, unknown>> {
    const response = await this.call('GetUserAgreementInfo', 2, request.sandbox, {
      appid: request.appid,
      steamid: request.steamId,
    });

    return {
      query: request,
      response,
    };
  }

  async getUserInfo(request: MicroTxnUserInfoRequest): Promise<Record<string, unknown>> {
    const response = await this.call('GetUserInfo', 2, request.sandbox, {
      appid: request.appid,
      steamid: request.steamId,
      ipaddress: request.ipAddress,
    });

    return {
      query: request,
      response,
    };
  }

  async queryTxn(request: MicroTxnQueryTxnRequest): Promise<Record<string, unknown>> {
    const orderId = request.orderId?.trim();
    const transId = request.transId?.trim();

    if (!orderId && !transId) {
      throw new SteamMcpError({
        code: 'validation_error',
        message: 'Either orderId or transId is required to query a Steam microtransaction.',
      });
    }

    const response = await this.call('QueryTxn', 3, request.sandbox, {
      appid: request.appid,
      orderid: orderId,
      transid: transId,
    });

    return {
      query: {
        appid: request.appid,
        orderId,
        transId,
        sandbox: request.sandbox,
      },
      response,
    };
  }

  private async call(
    methodName: string,
    version: number,
    sandbox: boolean | undefined,
    params: Record<string, string | number | undefined>,
  ): Promise<unknown> {
    const publisherKey = resolvePublisherKey(this.options.publisherKey);

    if (!publisherKey) {
      throw new SteamMcpError({
        code: 'authorization_required',
        message: 'This Steam MicroTxn method requires STEAM_PUBLISHER_KEY with Microtransaction permissions.',
      });
    }

    const interfaceName = sandbox ? 'ISteamMicroTxnSandbox' : 'ISteamMicroTxn';
    const url = new URL(`https://partner.steam-api.com/${interfaceName}/${methodName}/v${version}/`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('key', publisherKey);

    for (const [name, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
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
