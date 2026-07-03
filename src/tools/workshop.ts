import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamWorkshopClient } from '../steam/workshop-client.js';

const requiredKvTagSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
});

export function registerWorkshopTools(server: McpServer, workshopClient: SteamWorkshopClient): void {
  server.registerTool(
    'steam_query_workshop_files',
    {
      title: 'Query Steam Workshop files',
      description: 'Search Steam Workshop published files through IPublishedFileService/QueryFiles using a Web API key.',
      inputSchema: {
        queryType: z.number().int().min(0).max(21),
        page: z.number().int().positive().max(1000).optional(),
        cursor: z.string().min(1).optional(),
        numPerPage: z.number().int().positive().max(100).optional(),
        creatorAppid: z.number().int().positive(),
        appid: z.number().int().positive(),
        requiredTags: z.string().min(1).optional(),
        excludedTags: z.string().min(1).optional(),
        matchAllTags: z.boolean().optional(),
        requiredFlags: z.string().min(1).optional(),
        omittedFlags: z.string().min(1).optional(),
        searchText: z.string().min(1).optional(),
        fileType: z.number().int().min(0).max(20).optional(),
        childPublishedFileId: z.string().regex(/^\d+$/).optional(),
        days: z.number().int().min(1).max(7).optional(),
        includeRecentVotesOnly: z.boolean().optional(),
        cacheMaxAgeSeconds: z.number().int().nonnegative().optional(),
        language: z.number().int().nonnegative().optional(),
        requiredKvTags: z.array(requiredKvTagSchema).min(1).max(25).optional(),
        totalOnly: z.boolean().optional(),
        idsOnly: z.boolean().optional(),
        returnVoteData: z.boolean().optional(),
        returnTags: z.boolean().optional(),
        returnKvTags: z.boolean().optional(),
        returnPreviews: z.boolean().optional(),
        returnChildren: z.boolean().optional(),
        returnShortDescription: z.boolean().optional(),
        returnForSaleData: z.boolean().optional(),
        returnMetadata: z.boolean().optional(),
        returnPlaytimeStats: z.number().int().nonnegative().optional(),
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
          data: await workshopClient.queryFiles(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

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
