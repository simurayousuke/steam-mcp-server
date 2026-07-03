import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamWorkshopClient } from '../steam/workshop-client.js';

export function registerWorkshopTools(server: McpServer, workshopClient: SteamWorkshopClient): void {
  server.registerTool(
    'steam_get_workshop_file_details',
    {
      title: 'Get Steam Workshop file details',
      description: 'Fetch details for one or more Steam Workshop published file ids.',
      inputSchema: {
        publishedFileIds: z.array(z.string().min(1)).min(1).max(100),
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
          data: await workshopClient.getPublishedFileDetails(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_workshop_collection_details',
    {
      title: 'Get Steam Workshop collection details',
      description: 'Fetch collection children for one or more Steam Workshop collection ids.',
      inputSchema: {
        publishedFileIds: z.array(z.string().min(1)).min(1).max(100),
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
          data: await workshopClient.getCollectionDetails(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
