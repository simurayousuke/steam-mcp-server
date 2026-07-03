import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { getServerMetadata } from '../mcp/server.js';

export function registerHealthTool(server: McpServer): void {
  server.registerTool(
    'steam_health_check',
    {
      title: 'Steam MCP health check',
      description: 'Return local server status and currently implemented capability groups.',
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    () => {
      const metadata = getServerMetadata();
      const status = {
        status: 'ok',
        server: metadata,
        capabilities: {
          mcpTransport: ['stdio'],
          implementedToolGroups: ['health'],
          plannedToolGroups: ['steam-web-api-catalog', 'steam-store', 'steam-user-auth'],
        },
      };

      return {
        structuredContent: status,
        content: [
          {
            type: 'text',
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    },
  );
}
