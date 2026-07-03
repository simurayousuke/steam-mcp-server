import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamEconServiceClient } from '../steam/econ-service-client.js';

const uint64Schema = z.string().regex(/^\d+$/);

export function registerEconServiceTools(server: McpServer, econServiceClient: SteamEconServiceClient): void {
  server.registerTool(
    'steam_get_trade_history',
    {
      title: 'Get Steam trade history',
      description: 'Get Steam trade history for the account associated with the configured Web API key.',
      inputSchema: {
        maxTrades: z.number().int().positive().max(500).optional(),
        startAfterTime: z.number().int().nonnegative().optional(),
        startAfterTradeId: uint64Schema.optional(),
        navigatingBack: z.boolean().optional(),
        getDescriptions: z.boolean().optional(),
        language: z.string().min(2).optional(),
        includeFailed: z.boolean().optional(),
        includeTotal: z.boolean().optional(),
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
          data: await econServiceClient.getTradeHistory(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_trade_offers',
    {
      title: 'Get Steam trade offers',
      description: 'Get sent and/or received Steam trade offers for the account associated with the configured Web API key.',
      inputSchema: {
        getSentOffers: z.boolean().optional(),
        getReceivedOffers: z.boolean().optional(),
        getDescriptions: z.boolean().optional(),
        language: z.string().min(2).optional(),
        activeOnly: z.boolean().optional(),
        historicalOnly: z.boolean().optional(),
        timeHistoricalCutoff: z.number().int().nonnegative().optional(),
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
          data: await econServiceClient.getTradeOffers(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_trade_offer',
    {
      title: 'Get Steam trade offer',
      description: 'Get one Steam trade offer for the account associated with the configured Web API key.',
      inputSchema: {
        tradeOfferId: uint64Schema,
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
          data: await econServiceClient.getTradeOffer(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_trade_offers_summary',
    {
      title: 'Get Steam trade offers summary',
      description: 'Get counts of pending and new Steam trade offers for the account associated with the configured Web API key.',
      inputSchema: {
        timeLastVisit: z.number().int().nonnegative().optional(),
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
          data: await econServiceClient.getTradeOffersSummary(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
