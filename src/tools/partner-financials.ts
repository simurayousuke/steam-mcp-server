import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamPartnerFinancialsClient } from '../steam/partner-financials-client.js';

const financialDateSchema = z.string().regex(/^(?:\d{4}-\d{2}-\d{2}|\d{4}\/\d{2}\/\d{2}|\d{8})$/);
const uint64Schema = z.string().regex(/^\d+$/);

export function registerPartnerFinancialsTools(
  server: McpServer,
  partnerFinancialsClient: SteamPartnerFinancialsClient,
): void {
  server.registerTool(
    'steam_financial_get_changed_dates',
    {
      title: 'Get Steam financial changed dates',
      description: 'Get partner financial dates changed since a highwatermark using STEAM_FINANCIAL_KEY.',
      inputSchema: {
        highWatermark: uint64Schema,
        includeViewGrants: z.boolean().optional(),
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
          data: await partnerFinancialsClient.getChangedDatesForPartner(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_financial_get_detailed_sales',
    {
      title: 'Get Steam financial detailed sales',
      description: 'Get detailed partner sales for one date and per-date highwatermark using STEAM_FINANCIAL_KEY.',
      inputSchema: {
        date: financialDateSchema,
        highWatermarkId: uint64Schema,
        includeViewGrants: z.boolean().optional(),
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
          data: await partnerFinancialsClient.getDetailedSales(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_financial_get_app_wishlist_reporting',
    {
      title: 'Get Steam financial app wishlist reporting',
      description: 'Get detailed app wishlist reporting for one date using STEAM_FINANCIAL_KEY.',
      inputSchema: {
        appid: z.number().int().positive(),
        date: financialDateSchema,
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
          data: await partnerFinancialsClient.getAppWishlistReporting(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
