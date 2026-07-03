import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamStoreClient } from '../steam/store-client.js';

export function registerStoreTools(server: McpServer, storeClient: SteamStoreClient): void {
  server.registerTool(
    'steam_search_apps',
    {
      title: 'Search Steam apps',
      description: 'Search Steam Store apps by text query.',
      inputSchema: {
        term: z.string().min(1),
        country: z.string().min(2).optional(),
        language: z.string().min(2).optional(),
        limit: z.number().int().positive().max(100).optional(),
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
          data: await storeClient.searchApps(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_app_details',
    {
      title: 'Get Steam app details',
      description: 'Fetch Steam Store app details for one appid.',
      inputSchema: {
        appid: z.number().int().positive(),
        country: z.string().min(2).optional(),
        language: z.string().min(2).optional(),
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
          data: await storeClient.getAppDetails(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_app_reviews',
    {
      title: 'Get Steam app reviews',
      description: 'Fetch Steam Store review summary and review rows for one app.',
      inputSchema: {
        appid: z.number().int().positive(),
        cursor: z.string().min(1).optional(),
        dayRange: z.number().int().positive().optional(),
        filter: z.enum(['all', 'recent', 'updated', 'funny', 'helpful', 'summary']).optional(),
        language: z.string().min(2).optional(),
        numPerPage: z.number().int().positive().max(100).optional(),
        purchaseType: z.enum(['all', 'steam', 'non_steam_purchase']).optional(),
        reviewType: z.enum(['all', 'positive', 'negative']).optional(),
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
          data: await storeClient.getAppReviews(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_store_package',
    {
      title: 'Get Steam store package',
      description: 'Fetch Steam Store package details by package id.',
      inputSchema: {
        packageId: z.number().int().positive(),
        country: z.string().min(2).optional(),
        language: z.string().min(2).optional(),
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
          data: await storeClient.getStorePackage(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_user_wishlist',
    {
      title: 'Get public Steam wishlist',
      description: 'Fetch public Steam wishlist JSON when the target profile exposes it.',
      inputSchema: {
        steamId: z.string().min(1).optional(),
        vanityName: z.string().min(1).optional(),
        page: z.number().int().min(0).optional(),
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
          data: await storeClient.getPublicWishlist(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
