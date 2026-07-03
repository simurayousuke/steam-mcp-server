import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { SteamMcpError } from '../common/errors.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamInventoryClient } from '../steam/inventory-client.js';

const steamIdSchema = z.string().regex(/^\d+$/);
const numericIdSchema = z.string().regex(/^\d+$/);
const inventoryTimestampSchema = z.string().regex(/^\d{8}T\d{6}Z$/);

export function registerInventoryTools(
  server: McpServer,
  inventoryClient: SteamInventoryClient,
  authManager: SteamOpenIdAuthManager,
): void {
  server.registerTool(
    'steam_get_inventory_service_inventory',
    {
      title: 'Get Steam Inventory Service inventory',
      description:
        'Retrieve one user inventory for one app through IInventoryService using a publisher key with Economy permissions. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        appid: z.number().int().positive(),
        steamId: steamIdSchema.optional(),
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
          data: await inventoryClient.getInventory({
            appid: args.appid,
            steamId: resolveSteamId(args.steamId, authManager),
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_inventory_item_defs',
    {
      title: 'Get Steam Inventory item definitions',
      description: 'Retrieve Inventory Service item definitions for one app using a publisher key with Economy permissions.',
      inputSchema: {
        appid: z.number().int().positive(),
        modifiedSince: inventoryTimestampSchema.optional(),
        itemdefIds: z.array(numericIdSchema).min(1).max(100).optional(),
        workshopIds: z.array(numericIdSchema).min(1).max(100).optional(),
        cacheMaxAgeSeconds: z.number().int().nonnegative().max(86_400).optional(),
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
          data: await inventoryClient.getItemDefs(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_inventory_price_sheet',
    {
      title: 'Get Steam Inventory price sheet',
      description: 'Retrieve the Inventory Service price sheet for one Steam currency using a publisher key.',
      inputSchema: {
        currency: z.number().int().positive(),
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
          data: await inventoryClient.getPriceSheet({
            currency: args.currency,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_inventory_quantity',
    {
      title: 'Get Steam Inventory quantity',
      description:
        'Get available item quantities for one user and app through IInventoryService using a publisher key. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        appid: z.number().int().positive(),
        itemdefIds: z.array(numericIdSchema).min(1).max(100),
        steamId: steamIdSchema.optional(),
        force: z.boolean().optional(),
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
          data: await inventoryClient.getQuantity({
            appid: args.appid,
            steamId: resolveSteamId(args.steamId, authManager),
            itemdefIds: args.itemdefIds,
            force: args.force,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}

function resolveSteamId(explicitSteamId: string | undefined, authManager: SteamOpenIdAuthManager): string {
  if (explicitSteamId) {
    return explicitSteamId;
  }

  const [steamId] = authManager.getStatus().authenticatedSteamIds;

  if (!steamId) {
    throw new SteamMcpError({
      code: 'authentication_required',
      message: 'steamId is required when no Steam OpenID session is authenticated.',
    });
  }

  return steamId;
}
