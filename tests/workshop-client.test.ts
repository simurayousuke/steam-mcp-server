import { describe, expect, it } from 'vitest';

import { SteamWorkshopClient } from '../src/steam/workshop-client.js';

describe('SteamWorkshopClient', () => {
  it('posts published file ids for details', async () => {
    let submittedForm: URLSearchParams | undefined;
    const client = new SteamWorkshopClient({
      cacheTtlMs: 60_000,
      http: {
        getJson: async () => ({}),
        postFormJson: async (_url, form) => {
          submittedForm = form;
          return {
            response: {
              result: 1,
              resultcount: 1,
              publishedfiledetails: [
                {
                  publishedfileid: '848618186',
                },
              ],
            },
          };
        },
      },
    });

    await expect(
      client.getPublishedFileDetails({
        publishedFileIds: ['848618186'],
      }),
    ).resolves.toMatchObject({
      result: 1,
      resultCount: 1,
      details: [
        {
          publishedfileid: '848618186',
        },
      ],
    });
    expect(submittedForm?.get('itemcount')).toBe('1');
    expect(submittedForm?.get('publishedfileids[0]')).toBe('848618186');
  });

  it('posts collection ids for collection details', async () => {
    let submittedForm: URLSearchParams | undefined;
    const client = new SteamWorkshopClient({
      cacheTtlMs: 60_000,
      http: {
        getJson: async () => ({}),
        postFormJson: async (_url, form) => {
          submittedForm = form;
          return {
            response: {
              result: 1,
              resultcount: 1,
              collectiondetails: [
                {
                  publishedfileid: '123',
                  children: [],
                },
              ],
            },
          };
        },
      },
    });

    await expect(
      client.getCollectionDetails({
        publishedFileIds: ['123'],
      }),
    ).resolves.toMatchObject({
      result: 1,
      resultCount: 1,
      details: [
        {
          publishedfileid: '123',
          children: [],
        },
      ],
    });
    expect(submittedForm?.get('collectioncount')).toBe('1');
    expect(submittedForm?.get('publishedfileids[0]')).toBe('123');
  });

  it('rejects empty published file id lists before making requests', async () => {
    let requestCount = 0;
    const client = new SteamWorkshopClient({
      cacheTtlMs: 60_000,
      http: {
        getJson: async () => ({}),
        postFormJson: async () => {
          requestCount += 1;
          return {};
        },
      },
    });

    await expect(
      client.getPublishedFileDetails({
        publishedFileIds: ['   '],
      }),
    ).rejects.toMatchObject({
      code: 'validation_error',
    });
    expect(requestCount).toBe(0);
  });

  it('queries published files with input_json and a Web API key', async () => {
    let requestedUrl: URL | undefined;
    const client = new SteamWorkshopClient({
      webApiKey: 'configured-key',
      cacheTtlMs: 60_000,
      http: {
        getJson: async (url) => {
          requestedUrl = url;
          return {
            response: {
              total: 1,
              publishedfiledetails: [
                {
                  publishedfileid: '848618186',
                },
              ],
            },
          };
        },
        postFormJson: async () => ({}),
      },
    });

    await expect(
      client.queryFiles({
        queryType: 12,
        cursor: '*',
        numPerPage: 10,
        creatorAppid: 620,
        appid: 620,
        searchText: 'portal',
        requiredTags: 'Puzzle',
        returnTags: true,
        requiredKvTags: [
          {
            key: 'difficulty',
            value: 'hard',
          },
        ],
      }),
    ).resolves.toMatchObject({
      response: {
        total: 1,
      },
    });

    expect(requestedUrl?.origin).toBe('https://api.steampowered.com');
    expect(requestedUrl?.pathname).toBe('/IPublishedFileService/QueryFiles/v1/');
    expect(requestedUrl?.searchParams.get('key')).toBe('configured-key');
    expect(JSON.parse(requestedUrl?.searchParams.get('input_json') ?? '{}')).toEqual({
      query_type: 12,
      cursor: '*',
      numperpage: 10,
      creator_appid: 620,
      appid: 620,
      requiredtags: 'Puzzle',
      search_text: 'portal',
      required_kv_tags: [
        {
          key: 'difficulty',
          value: 'hard',
        },
      ],
      return_tags: true,
    });
  });

  it('requires a Web API key before querying published files', async () => {
    let requestCount = 0;
    const client = new SteamWorkshopClient({
      cacheTtlMs: 60_000,
      http: {
        getJson: async () => {
          requestCount += 1;
          return {};
        },
        postFormJson: async () => ({}),
      },
    });

    await expect(
      client.queryFiles({
        queryType: 0,
        creatorAppid: 620,
        appid: 620,
      }),
    ).rejects.toMatchObject({
      code: 'authentication_required',
    });
    expect(requestCount).toBe(0);
  });
});
