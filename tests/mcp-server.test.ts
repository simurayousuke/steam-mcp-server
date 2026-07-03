import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';

import { createSteamMcpServer } from '../src/mcp/server.js';

describe('Steam MCP server', () => {
  it('lists tools and calls the health check over MCP', async () => {
    const server = createSteamMcpServer();
    const client = new Client({
      name: 'steam-mcp-server-test-client',
      version: '0.0.0',
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    try {
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
      const tools = await client.listTools();

      expect(tools.tools.map((tool) => tool.name)).toEqual(
        expect.arrayContaining([
          'steam_health_check',
          'steam_auth_start',
          'steam_api_list_interfaces',
          'steam_api_call_readonly',
          'steam_search_apps',
          'steam_get_app_reviews',
          'steam_get_store_package',
          'steam_get_public_inventory',
          'steam_get_owned_games',
          'steam_get_workshop_file_details',
          'steam_get_workshop_collection_details',
        ]),
      );

      const result = await client.callTool({
        name: 'steam_health_check',
        arguments: {},
      });

      expect(result.structuredContent).toMatchObject({
        status: 'ok',
      });
    } finally {
      await client.close();
      await server.close();
    }
  });
});
