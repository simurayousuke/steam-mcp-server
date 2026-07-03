import { describe, expect, it } from 'vitest';

import { SteamPublisherClient } from '../src/steam/publisher-client.js';

describe('SteamPublisherClient', () => {
  it('injects the configured publisher key and app ownership parameters', async () => {
    let requestedUrl: URL | undefined;
    const client = new SteamPublisherClient({
      publisherKey: 'publisher-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url) => {
          requestedUrl = url;
          return {
            appownership: {},
          };
        },
      },
    });

    await client.checkAppOwnership({
      steamId: '76561197960434622',
      appid: 620,
    });

    expect(requestedUrl?.origin).toBe('https://partner.steam-api.com');
    expect(requestedUrl?.pathname).toBe('/ISteamUser/CheckAppOwnership/v4/');
    expect(requestedUrl?.searchParams.get('key')).toBe('publisher-key');
    expect(requestedUrl?.searchParams.get('steamid')).toBe('76561197960434622');
    expect(requestedUrl?.searchParams.get('appid')).toBe('620');
  });

  it('calls publisher read endpoints with expected parameters', async () => {
    const requestedPaths: string[] = [];
    const requestedParams: Record<string, string | null>[] = [];
    const client = new SteamPublisherClient({
      publisherKey: 'publisher-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url) => {
          requestedPaths.push(url.pathname);
          requestedParams.push({
            appids: url.searchParams.get('appids'),
            rowversion: url.searchParams.get('rowversion'),
            steamid: url.searchParams.get('steamid'),
          });
          return {
            response: {},
          };
        },
      },
    });

    await client.getPublisherAppOwnership({
      steamId: '76561197960434622',
    });
    await client.getAppPriceInfo({
      steamId: '76561197960434622',
      appids: [620, 400],
    });
    await client.getDeletedSteamIds({
      rowVersion: '0',
    });
    await client.getUserGroupList({
      steamId: '76561197960434622',
    });

    expect(requestedPaths).toEqual([
      '/ISteamUser/GetPublisherAppOwnership/v4/',
      '/ISteamUser/GetAppPriceInfo/v1/',
      '/ISteamUser/GetDeletedSteamIDs/v1/',
      '/ISteamUser/GetUserGroupList/v1/',
    ]);
    expect(requestedParams).toEqual([
      {
        appids: null,
        rowversion: null,
        steamid: '76561197960434622',
      },
      {
        appids: '620,400',
        rowversion: null,
        steamid: '76561197960434622',
      },
      {
        appids: null,
        rowversion: '0',
        steamid: null,
      },
      {
        appids: null,
        rowversion: null,
        steamid: '76561197960434622',
      },
    ]);
  });

  it('calls publisher app endpoints with expected parameters', async () => {
    const requestedPaths: string[] = [];
    const requestedParams: Record<string, string | null>[] = [];
    const client = new SteamPublisherClient({
      publisherKey: 'publisher-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url) => {
          requestedPaths.push(url.pathname);
          requestedParams.push({
            appid: url.searchParams.get('appid'),
            count: url.searchParams.get('count'),
            filter: url.searchParams.get('filter'),
            key: url.searchParams.get('key'),
            limit: url.searchParams.get('limit'),
            type_filter: url.searchParams.get('type_filter'),
          });
          return {
            response: {},
          };
        },
      },
    });

    await client.getAppBetas({
      appid: 620,
    });
    await client.getAppBuilds({
      appid: 620,
      count: 20,
    });
    await client.getAppDepotVersions({
      appid: 620,
    });
    await client.getPartnerAppList({
      typeFilter: ['game', 'dlc'],
    });
    await client.getPlayersBanned({
      appid: 620,
    });
    await client.getServerList({
      filter: '\\appid\\620',
      limit: 50,
    });

    expect(requestedPaths).toEqual([
      '/ISteamApps/GetAppBetas/v1/',
      '/ISteamApps/GetAppBuilds/v1/',
      '/ISteamApps/GetAppDepotVersions/v1/',
      '/ISteamApps/GetPartnerAppListForWebAPIKey/v2/',
      '/ISteamApps/GetPlayersBanned/v1/',
      '/ISteamApps/GetServerList/v1/',
    ]);
    expect(requestedParams).toEqual([
      {
        appid: '620',
        count: null,
        filter: null,
        key: 'publisher-key',
        limit: null,
        type_filter: null,
      },
      {
        appid: '620',
        count: '20',
        filter: null,
        key: 'publisher-key',
        limit: null,
        type_filter: null,
      },
      {
        appid: '620',
        count: null,
        filter: null,
        key: 'publisher-key',
        limit: null,
        type_filter: null,
      },
      {
        appid: null,
        count: null,
        filter: null,
        key: 'publisher-key',
        limit: null,
        type_filter: 'game,dlc',
      },
      {
        appid: '620',
        count: null,
        filter: null,
        key: 'publisher-key',
        limit: null,
        type_filter: null,
      },
      {
        appid: null,
        count: null,
        filter: '\\appid\\620',
        key: 'publisher-key',
        limit: '50',
        type_filter: null,
      },
    ]);
  });

  it('authenticates Steam user tickets with publisher credentials', async () => {
    let requestedUrl: URL | undefined;
    const client = new SteamPublisherClient({
      publisherKey: 'publisher-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url) => {
          requestedUrl = url;
          return {
            response: {
              params: {
                steamid: '76561197960434622',
              },
            },
          };
        },
      },
    });

    await client.authenticateUserTicket({
      appid: 620,
      ticket: '00ff',
      identity: 'mcp-server',
    });

    expect(requestedUrl?.origin).toBe('https://partner.steam-api.com');
    expect(requestedUrl?.pathname).toBe('/ISteamUserAuth/AuthenticateUserTicket/v1/');
    expect(requestedUrl?.searchParams.get('appid')).toBe('620');
    expect(requestedUrl?.searchParams.get('ticket')).toBe('00ff');
    expect(requestedUrl?.searchParams.get('identity')).toBe('mcp-server');
    expect(requestedUrl?.searchParams.get('key')).toBe('publisher-key');
  });

  it('fetches finalized Workshop contributors with publisher credentials', async () => {
    let requestedUrl: URL | undefined;
    const client = new SteamPublisherClient({
      publisherKey: 'publisher-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url) => {
          requestedUrl = url;
          return {
            response: {
              contributors: [],
            },
          };
        },
      },
    });

    await client.getWorkshopFinalizedContributors({
      appid: 620,
      gameItemId: 123,
    });

    expect(requestedUrl?.origin).toBe('https://partner.steam-api.com');
    expect(requestedUrl?.pathname).toBe('/IWorkshopService/GetFinalizedContributors/v1/');
    expect(requestedUrl?.searchParams.get('appid')).toBe('620');
    expect(requestedUrl?.searchParams.get('gameitemid')).toBe('123');
    expect(requestedUrl?.searchParams.get('key')).toBe('publisher-key');
  });

  it('fetches Steam leaderboards with publisher credentials', async () => {
    const requestedPaths: string[] = [];
    const requestedParams: Record<string, string | null>[] = [];
    const client = new SteamPublisherClient({
      publisherKey: 'publisher-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url) => {
          requestedPaths.push(url.pathname);
          requestedParams.push({
            appid: url.searchParams.get('appid'),
            datarequest: url.searchParams.get('datarequest'),
            leaderboardid: url.searchParams.get('leaderboardid'),
            rangeend: url.searchParams.get('rangeend'),
            rangestart: url.searchParams.get('rangestart'),
            steamid: url.searchParams.get('steamid'),
            key: url.searchParams.get('key'),
          });
          return {
            response: {},
          };
        },
      },
    });

    await client.getLeaderboardsForGame({
      appid: 620,
    });
    await client.getLeaderboardEntries({
      appid: 620,
      leaderboardId: 123,
      rangeStart: 0,
      rangeEnd: 10,
      dataRequest: 'RequestAroundUser',
      steamId: '76561197960434622',
    });

    expect(requestedPaths).toEqual([
      '/ISteamLeaderboards/GetLeaderboardsForGame/v2/',
      '/ISteamLeaderboards/GetLeaderboardEntries/v1/',
    ]);
    expect(requestedParams).toEqual([
      {
        appid: '620',
        datarequest: null,
        leaderboardid: null,
        rangeend: null,
        rangestart: null,
        steamid: null,
        key: 'publisher-key',
      },
      {
        appid: '620',
        datarequest: 'RequestAroundUser',
        leaderboardid: '123',
        rangeend: '10',
        rangestart: '0',
        steamid: '76561197960434622',
        key: 'publisher-key',
      },
    ]);
  });

  it('posts publisher Workshop query endpoints with expected form parameters', async () => {
    const requestedPaths: string[] = [];
    const submittedForms: URLSearchParams[] = [];
    const client = new SteamPublisherClient({
      publisherKey: 'publisher-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async () => ({}),
        postFormJson: async (url, form) => {
          requestedPaths.push(url.pathname);
          submittedForms.push(form);
          return {
            response: {},
          };
        },
      },
    });

    await client.enumerateUserSubscribedFiles({
      steamId: '76561197960434622',
      appid: 620,
      listType: 0,
    });
    await client.searchPublishedItems({
      searchType: 'trend',
      steamId: '76561197960434622',
      appid: 620,
      startIndex: 5,
      count: 10,
      tags: ['Puzzle'],
      userTags: ['Favorite'],
      hasAppAdminAccess: true,
      fileType: 0,
      days: 7,
    });
    await client.getPublishedItemSearchSummary({
      steamId: '76561197960434622',
      appid: 620,
      tags: ['Puzzle'],
    });
    await client.getPublishedItemVoteSummary({
      steamId: '76561197960434622',
      appid: 620,
      publishedFileIds: ['123', '456'],
    });
    await client.getUserPublishedItemVoteSummary({
      steamId: '76561197960434622',
      publishedFileIds: ['123'],
    });

    expect(requestedPaths).toEqual([
      '/ISteamRemoteStorage/EnumerateUserSubscribedFiles/v1/',
      '/ISteamPublishedItemSearch/RankedByTrend/v1/',
      '/ISteamPublishedItemSearch/ResultSetSummary/v1/',
      '/ISteamPublishedItemVoting/ItemVoteSummary/v1/',
      '/ISteamPublishedItemVoting/UserVoteSummary/v1/',
    ]);
    expect(submittedForms[0]?.get('key')).toBe('publisher-key');
    expect(submittedForms[0]?.get('steamid')).toBe('76561197960434622');
    expect(submittedForms[0]?.get('appid')).toBe('620');
    expect(submittedForms[0]?.get('listtype')).toBe('0');
    expect(submittedForms[1]?.get('startidx')).toBe('5');
    expect(submittedForms[1]?.get('count')).toBe('10');
    expect(submittedForms[1]?.get('tagcount')).toBe('1');
    expect(submittedForms[1]?.get('tag[0]')).toBe('Puzzle');
    expect(submittedForms[1]?.get('usertagcount')).toBe('1');
    expect(submittedForms[1]?.get('usertag[0]')).toBe('Favorite');
    expect(submittedForms[1]?.get('hasappadminaccess')).toBe('true');
    expect(submittedForms[1]?.get('fileType')).toBe('0');
    expect(submittedForms[1]?.get('days')).toBe('7');
    expect(submittedForms[2]?.get('tag[0]')).toBe('Puzzle');
    expect(submittedForms[3]?.get('publishedfileid[0]')).toBe('123');
    expect(submittedForms[3]?.get('publishedfileid[1]')).toBe('456');
    expect(submittedForms[4]?.get('publishedfileid[0]')).toBe('123');
  });

  it('requires STEAM_PUBLISHER_KEY before making requests', async () => {
    let requestCount = 0;
    const client = new SteamPublisherClient({
      cacheTtlMs: 60_000,
      http: {
        getJson: async () => {
          requestCount += 1;
          return {};
        },
      },
    });

    await expect(
      client.checkAppOwnership({
        steamId: '76561197960434622',
        appid: 620,
      }),
    ).rejects.toMatchObject({
      code: 'authorization_required',
    });
    expect(requestCount).toBe(0);
  });
});
