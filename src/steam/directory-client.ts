import { z } from 'zod';

import { TtlCache } from '../common/cache.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

const genericResponseEnvelopeSchema = z
  .object({
    response: z.record(z.unknown()).default({}),
  })
  .passthrough();

export type SteamDirectoryClientOptions = {
  http: Pick<HttpJsonClient, 'getJson'>;
  cacheTtlMs: number;
};

export type GetCmListRequest = {
  cellId: number;
  maxCount?: number;
};

export type GetCmListForConnectRequest = {
  cellId?: number;
  cmType?: string;
  realm?: string;
  maxCount?: number;
  qosLevel?: number;
};

export type GetSdrConfigRequest = {
  appid: number;
};

export type GetCdnForVideoRequest = {
  propertyType: number;
  clientIp: string;
  clientRegion: string;
};

export type PickSingleContentServerRequest = {
  propertyType: number;
  cellId: number;
  clientIp: string;
};

export type GetServersForSteamPipeRequest = {
  cellId: number;
  maxServers?: number;
  ipOverride?: string;
  launcherType?: number;
  ipv6Public?: string;
  currentConnections?: Record<string, unknown>;
};

export type GetClientUpdateHostsRequest = {
  cachedSignature?: string;
};

export type GetDepotPatchInfoRequest = {
  appid: number;
  depotid: number;
  sourceManifestId: string;
  targetManifestId: string;
};

export class SteamDirectoryClient {
  private readonly cache: TtlCache<unknown>;

  constructor(private readonly options: SteamDirectoryClientOptions) {
    this.cache = new TtlCache<unknown>(options.cacheTtlMs);
  }

  async getCmList(request: GetCmListRequest): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/ISteamDirectory/GetCMList/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('cellid', String(request.cellId));
    setOptionalParam(url, 'maxcount', request.maxCount);

    return this.getResponseEnvelope(url, request, 'Steam CM list response did not match the expected schema.');
  }

  async getCmListForConnect(request: GetCmListForConnectRequest): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/ISteamDirectory/GetCMListForConnect/v1/');
    url.searchParams.set('format', 'json');
    setOptionalParam(url, 'cellid', request.cellId);
    setOptionalParam(url, 'cmtype', request.cmType);
    setOptionalParam(url, 'realm', request.realm);
    setOptionalParam(url, 'maxcount', request.maxCount);
    setOptionalParam(url, 'qoslevel', request.qosLevel);

    return this.getResponseEnvelope(url, request, 'Steam CM list for connect response did not match the expected schema.');
  }

  async getSteamPipeDomains(): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/ISteamDirectory/GetSteamPipeDomains/v1/');
    url.searchParams.set('format', 'json');

    return this.getResponseEnvelope(url, {}, 'SteamPipe domains response did not match the expected schema.');
  }

  async getSdrConfig(request: GetSdrConfigRequest): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/ISteamApps/GetSDRConfig/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('appid', String(request.appid));

    const response = await this.getCachedJson(url);

    return {
      query: request,
      response,
    };
  }

  async getCdnForVideo(request: GetCdnForVideoRequest): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/IContentServerDirectoryService/GetCDNForVideo/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('property_type', String(request.propertyType));
    url.searchParams.set('client_ip', request.clientIp);
    url.searchParams.set('client_region', request.clientRegion);

    return this.getResponseEnvelope(url, request, 'Steam CDN for video response did not match the expected schema.');
  }

  async pickSingleContentServer(request: PickSingleContentServerRequest): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/IContentServerDirectoryService/PickSingleContentServer/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('property_type', String(request.propertyType));
    url.searchParams.set('cell_id', String(request.cellId));
    url.searchParams.set('client_ip', request.clientIp);

    return this.getResponseEnvelope(url, request, 'Steam content server response did not match the expected schema.');
  }

  async getServersForSteamPipe(request: GetServersForSteamPipeRequest): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/IContentServerDirectoryService/GetServersForSteamPipe/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('cell_id', String(request.cellId));
    setOptionalParam(url, 'max_servers', request.maxServers);
    setOptionalParam(url, 'ip_override', request.ipOverride);
    setOptionalParam(url, 'launcher_type', request.launcherType);
    setOptionalParam(url, 'ipv6_public', request.ipv6Public);

    if (request.currentConnections !== undefined) {
      url.searchParams.set('current_connections', JSON.stringify(request.currentConnections));
    }

    return this.getResponseEnvelope(url, request, 'SteamPipe content servers response did not match the expected schema.');
  }

  async getClientUpdateHosts(request: GetClientUpdateHostsRequest): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/IContentServerDirectoryService/GetClientUpdateHosts/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('cached_signature', request.cachedSignature ?? '');

    return this.getResponseEnvelope(url, request, 'Steam client update hosts response did not match the expected schema.');
  }

  async getDepotPatchInfo(request: GetDepotPatchInfoRequest): Promise<Record<string, unknown>> {
    const url = new URL('https://api.steampowered.com/IContentServerDirectoryService/GetDepotPatchInfo/v1/');
    url.searchParams.set('format', 'json');
    url.searchParams.set('appid', String(request.appid));
    url.searchParams.set('depotid', String(request.depotid));
    url.searchParams.set('source_manifestid', request.sourceManifestId);
    url.searchParams.set('target_manifestid', request.targetManifestId);

    return this.getResponseEnvelope(url, request, 'Steam depot patch info response did not match the expected schema.');
  }

  private async getResponseEnvelope(
    url: URL,
    query: Record<string, unknown>,
    invalidMessage: string,
  ): Promise<Record<string, unknown>> {
    const raw = await this.getCachedJson(url);
    const parsed = genericResponseEnvelopeSchema.safeParse(raw);

    if (!parsed.success) {
      throw invalidDirectoryResponse(invalidMessage, parsed.error);
    }

    return {
      query,
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

function invalidDirectoryResponse(message: string, error: z.ZodError): SteamMcpError {
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
