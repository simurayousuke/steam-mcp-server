import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamEconomyClient } from '../steam/economy-client.js';

const assetClassSchema = z.object({
  classId: z.string().regex(/^\d+$/),
  instanceId: z.string().regex(/^\d+$/).optional(),
});

export function registerEconomyTools(server: McpServer, economyClient: SteamEconomyClient): void {
  server.registerTool(
    'steam_get_asset_class_info',
    {
      title: 'Get Steam asset class info',
      description: 'Fetch Steam Economy asset class metadata for one app using a Web API key.',
      inputSchema: {
        appid: z.number().int().positive(),
        language: z.string().min(2).optional(),
        assetClasses: z.array(assetClassSchema).min(1).max(100),
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
          data: await economyClient.getAssetClassInfo(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_asset_prices',
    {
      title: 'Get Steam asset prices',
      description: 'Fetch Steam Economy purchaseable asset prices for one app using a Web API key.',
      inputSchema: {
        appid: z.number().int().positive(),
        currency: z.string().min(3).max(3).optional(),
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
          data: await economyClient.getAssetPrices(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
