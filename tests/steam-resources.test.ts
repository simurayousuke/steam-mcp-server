import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { describe, expect, it } from 'vitest';

import { registerSteamResources } from '../src/resources/steam-resources.js';

describe('Steam MCP resources', () => {
  it('reads app, app news, and player resources', async () => {
    const server = new McpServer({
      name: 'steam-resource-test-server',
      version: '0.0.0',
    });
    registerSteamResources(server, {
      storeClient: {
        getAppDetails: async ({ appid }) => ({
          appid,
          data: {
            name: 'Portal 2',
          },
        }),
      },
      webApiClient: {
        getNewsForApp: async ({ appid, count, maxLength }) => ({
          appid,
          query: {
            count,
            maxLength,
          },
          newsItems: [
            {
              title: 'News',
            },
          ],
        }),
        getSchemaForGame: async ({ appid }) => ({
          appid,
          response: {
            game: {
              gameName: 'Portal 2',
            },
          },
        }),
      },
      playerClient: {
        getPlayerSummary: async ({ steamId }) => ({
          response: {
            players: [
              {
                steamid: steamId,
              },
            ],
          },
        }),
        getOwnedGames: async ({ steamId }) => ({
          steamId,
          response: {
            game_count: 1,
          },
        }),
        getRecentlyPlayedGames: async ({ steamId }) => ({
          steamId,
          response: {
            total_count: 1,
          },
        }),
        getSingleGamePlaytime: async ({ steamId, appid }) => ({
          steamId,
          appid,
          response: {
            playtime_forever: 120,
          },
        }),
        getSteamLevel: async ({ steamId }) => ({
          steamId,
          response: {
            player_level: 42,
          },
        }),
        getBadges: async ({ steamId }) => ({
          steamId,
          response: {
            badges: [],
          },
        }),
        getCommunityBadgeProgress: async ({ steamId, badgeid }) => ({
          steamId,
          badgeid,
          response: {
            quests: [],
          },
        }),
        getFriendList: async ({ steamId }) => ({
          steamId,
          friendslist: {
            friends: [],
          },
        }),
      },
    });
    const client = new Client({
      name: 'steam-resource-test-client',
      version: '0.0.0',
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    try {
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

      const app = await client.readResource({
        uri: 'steam://apps/620',
      });
      expect(JSON.parse(app.contents[0]?.text ?? '{}')).toMatchObject({
        appid: 620,
        data: {
          name: 'Portal 2',
        },
      });

      const news = await client.readResource({
        uri: 'steam://apps/620/news',
      });
      expect(JSON.parse(news.contents[0]?.text ?? '{}')).toMatchObject({
        appid: 620,
        query: {
          count: 10,
          maxLength: 1000,
        },
      });

      const schema = await client.readResource({
        uri: 'steam://apps/620/schema',
      });
      expect(JSON.parse(schema.contents[0]?.text ?? '{}')).toMatchObject({
        appid: 620,
        response: {
          game: {
            gameName: 'Portal 2',
          },
        },
      });

      const player = await client.readResource({
        uri: 'steam://players/76561197960434622',
      });
      expect(JSON.parse(player.contents[0]?.text ?? '{}')).toMatchObject({
        response: {
          players: [
            {
              steamid: '76561197960434622',
            },
          ],
        },
      });

      const ownedGames = await client.readResource({
        uri: 'steam://players/76561197960434622/owned-games',
      });
      expect(JSON.parse(ownedGames.contents[0]?.text ?? '{}')).toMatchObject({
        steamId: '76561197960434622',
        response: {
          game_count: 1,
        },
      });

      const appPlaytime = await client.readResource({
        uri: 'steam://players/76561197960434622/apps/620/playtime',
      });
      expect(JSON.parse(appPlaytime.contents[0]?.text ?? '{}')).toMatchObject({
        steamId: '76561197960434622',
        appid: 620,
        response: {
          playtime_forever: 120,
        },
      });

      const recentlyPlayed = await client.readResource({
        uri: 'steam://players/76561197960434622/recently-played',
      });
      expect(JSON.parse(recentlyPlayed.contents[0]?.text ?? '{}')).toMatchObject({
        steamId: '76561197960434622',
        response: {
          total_count: 1,
        },
      });

      const steamLevel = await client.readResource({
        uri: 'steam://players/76561197960434622/steam-level',
      });
      expect(JSON.parse(steamLevel.contents[0]?.text ?? '{}')).toMatchObject({
        steamId: '76561197960434622',
        response: {
          player_level: 42,
        },
      });

      const badges = await client.readResource({
        uri: 'steam://players/76561197960434622/badges',
      });
      expect(JSON.parse(badges.contents[0]?.text ?? '{}')).toMatchObject({
        steamId: '76561197960434622',
        response: {
          badges: [],
        },
      });

      const badgeProgress = await client.readResource({
        uri: 'steam://players/76561197960434622/badges/2/progress',
      });
      expect(JSON.parse(badgeProgress.contents[0]?.text ?? '{}')).toMatchObject({
        steamId: '76561197960434622',
        badgeid: 2,
        response: {
          quests: [],
        },
      });

      const friends = await client.readResource({
        uri: 'steam://players/76561197960434622/friends',
      });
      expect(JSON.parse(friends.contents[0]?.text ?? '{}')).toMatchObject({
        steamId: '76561197960434622',
        friendslist: {
          friends: [],
        },
      });
    } finally {
      await client.close();
      await server.close();
    }
  });
});
