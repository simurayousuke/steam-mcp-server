import { describe, expect, it } from 'vitest';

import { SteamWorkshopClient } from '../src/steam/workshop-client.js';

describe('SteamWorkshopClient', () => {
  it('posts published file ids for details', async () => {
    let submittedForm: URLSearchParams | undefined;
    const client = new SteamWorkshopClient({
      cacheTtlMs: 60_000,
      http: {
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
});
