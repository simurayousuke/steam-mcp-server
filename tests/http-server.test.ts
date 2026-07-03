import { type AddressInfo } from 'node:net';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { describe, expect, it } from 'vitest';

import { createSteamMcpHttpServer } from '../src/mcp/http-server.js';

describe('Steam MCP HTTP server', () => {
  it('serves MCP requests over Streamable HTTP', async () => {
    const httpServer = createSteamMcpHttpServer();
    const client = new Client({
      name: 'steam-mcp-http-test-client',
      version: '0.0.0',
    });

    await new Promise<void>((resolve, reject) => {
      httpServer.server.once('error', reject);
      httpServer.server.listen(0, '127.0.0.1', () => {
        httpServer.server.off('error', reject);
        resolve();
      });
    });

    const address = httpServer.server.address() as AddressInfo;
    const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}${httpServer.endpoint}`));

    try {
      await client.connect(transport);

      const tools = await client.listTools();
      const resources = await client.listResources();
      const healthCheck = await client.callTool({
        name: 'steam_health_check',
        arguments: {},
      });

      expect(tools.tools.map((tool) => tool.name)).toEqual(
        expect.arrayContaining(['steam_health_check', 'steam_get_authorized_user_overview']),
      );
      expect(resources.resources.map((resource) => resource.uri)).toEqual(expect.arrayContaining(['steam://me/overview']));
      expect(healthCheck.structuredContent).toMatchObject({
        status: 'ok',
        capabilities: {
          mcpTransport: expect.arrayContaining(['streamable-http']),
        },
      });
    } finally {
      await client.close();
      await httpServer.close();
    }
  });
});
