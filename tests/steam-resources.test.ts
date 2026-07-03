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
    } finally {
      await client.close();
      await server.close();
    }
  });
});
