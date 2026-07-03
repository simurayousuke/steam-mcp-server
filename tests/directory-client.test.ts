import { describe, expect, it } from 'vitest';

import { SteamDirectoryClient } from '../src/steam/directory-client.js';

function createDirectoryClient(getJson: (url: URL) => Promise<unknown>): SteamDirectoryClient {
  return new SteamDirectoryClient({
    http: {
      getJson,
    },
    cacheTtlMs: 60_000,
  });
}

describe('SteamDirectoryClient', () => {
  it('fetches Steam connection manager lists', async () => {
    const requestedPaths: string[] = [];
    const client = createDirectoryClient(async (url) => {
      requestedPaths.push(`${url.pathname}?${url.searchParams.toString()}`);
      return {
        response: {
          result: 1,
          serverlist: ['127.0.0.1:27017'],
        },
      };
    });

    await expect(client.getCmList({ cellId: 0, maxCount: 2 })).resolves.toMatchObject({
      query: {
        cellId: 0,
      },
      response: {
        result: 1,
      },
    });
    await expect(client.getCmListForConnect({ cellId: 0, maxCount: 2, cmType: 'websockets' })).resolves.toMatchObject({
      response: {
        serverlist: ['127.0.0.1:27017'],
      },
    });

    expect(requestedPaths[0]).toContain('/ISteamDirectory/GetCMList/v1/');
    expect(requestedPaths[0]).toContain('cellid=0');
    expect(requestedPaths[0]).toContain('maxcount=2');
    expect(requestedPaths[1]).toContain('/ISteamDirectory/GetCMListForConnect/v1/');
    expect(requestedPaths[1]).toContain('cmtype=websockets');
  });

  it('fetches SteamPipe domains and SDR config', async () => {
    const client = createDirectoryClient(async (url) => {
      if (url.pathname.includes('GetSDRConfig')) {
        return {
          revision: 1,
          pops: {},
        };
      }

      return {
        response: {
          domainlist: ['*.steamcontent.com'],
        },
      };
    });

    await expect(client.getSteamPipeDomains()).resolves.toMatchObject({
      response: {
        domainlist: ['*.steamcontent.com'],
      },
    });
    await expect(client.getSdrConfig({ appid: 730 })).resolves.toMatchObject({
      query: {
        appid: 730,
      },
      response: {
        revision: 1,
      },
    });
  });

  it('fetches content server directory endpoints', async () => {
    const requestedUrls: URL[] = [];
    const client = createDirectoryClient(async (url) => {
      requestedUrls.push(new URL(url.toString()));
      return {
        response: {
          ok: true,
        },
      };
    });

    await client.getCdnForVideo({
      propertyType: 1,
      clientIp: '127.0.0.1',
      clientRegion: 'US',
    });
    await client.pickSingleContentServer({
      propertyType: 1,
      cellId: 0,
      clientIp: '127.0.0.1',
    });
    await client.getServersForSteamPipe({
      cellId: 0,
      maxServers: 2,
      currentConnections: {
        sample: true,
      },
    });
    await client.getClientUpdateHosts({
      cachedSignature: 'signature',
    });
    await client.getDepotPatchInfo({
      appid: 730,
      depotid: 731,
      sourceManifestId: '1',
      targetManifestId: '2',
    });

    expect(requestedUrls[0]?.pathname).toBe('/IContentServerDirectoryService/GetCDNForVideo/v1/');
    expect(requestedUrls[0]?.searchParams.get('client_region')).toBe('US');
    expect(requestedUrls[1]?.pathname).toBe('/IContentServerDirectoryService/PickSingleContentServer/v1/');
    expect(requestedUrls[1]?.searchParams.get('cell_id')).toBe('0');
    expect(requestedUrls[2]?.pathname).toBe('/IContentServerDirectoryService/GetServersForSteamPipe/v1/');
    expect(requestedUrls[2]?.searchParams.get('current_connections')).toBe(JSON.stringify({ sample: true }));
    expect(requestedUrls[3]?.pathname).toBe('/IContentServerDirectoryService/GetClientUpdateHosts/v1/');
    expect(requestedUrls[3]?.searchParams.get('cached_signature')).toBe('signature');
    expect(requestedUrls[4]?.pathname).toBe('/IContentServerDirectoryService/GetDepotPatchInfo/v1/');
    expect(requestedUrls[4]?.searchParams.get('source_manifestid')).toBe('1');
  });
});
