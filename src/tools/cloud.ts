import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamCloudClient } from '../steam/cloud-client.js';

export function registerCloudTools(server: McpServer, cloudClient: SteamCloudClient): void {
  server.registerTool(
    'steam_cloud_enumerate_user_files',
    {
      title: 'Enumerate Steam Cloud user files',
      description: 'Enumerate Steam Cloud files for one app using a Steam OAuth access token with read_cloud permission.',
      inputSchema: {
        appid: z.number().int().positive(),
        extendedDetails: z.boolean().optional(),
        count: z.number().int().positive().max(500).optional(),
        startIndex: z.number().int().nonnegative().optional(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        return toolSuccess({
          data: await cloudClient.enumerateUserFiles(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
