import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { SteamMcpError } from '../common/errors.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamMicroTxnClient } from '../steam/microtxn-client.js';
import { steamMicroTxnReportTypes } from '../steam/microtxn-client.js';

const steamIdSchema = z.string().regex(/^\d+$/);
const uint64Schema = z.string().regex(/^\d+$/);
const rfc3339UtcSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/);
const ipv4Schema = z.string().regex(/^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/);

export function registerMicroTxnTools(
  server: McpServer,
  microTxnClient: SteamMicroTxnClient,
  authManager: SteamOpenIdAuthManager,
): void {
  server.registerTool(
    'steam_microtxn_get_report',
    {
      title: 'Get Steam MicroTxn report',
      description:
        'Get a Steam microtransaction reconciliation report using STEAM_PUBLISHER_KEY with Microtransaction permissions.',
      inputSchema: {
        appid: z.number().int().positive(),
        type: z.enum(steamMicroTxnReportTypes).optional(),
        time: rfc3339UtcSchema,
        maxResults: z.number().int().positive().max(50_000).optional(),
        sandbox: z.boolean().optional(),
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
          data: await microTxnClient.getReport(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_microtxn_get_user_agreement_info',
    {
      title: 'Get Steam MicroTxn user agreement info',
      description:
        'Get recurring billing agreement information for one Steam user. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        appid: z.number().int().positive(),
        steamId: steamIdSchema.optional(),
        sandbox: z.boolean().optional(),
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
          data: await microTxnClient.getUserAgreementInfo({
            appid: args.appid,
            steamId: resolveSteamId(args.steamId, authManager),
            sandbox: args.sandbox,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_microtxn_get_user_info',
    {
      title: 'Get Steam MicroTxn user purchasing info',
      description:
        'Get Steam wallet purchasing region/currency/status information. If steamId is omitted, use the authenticated OpenID SteamID when available.',
      inputSchema: {
        appid: z.number().int().positive(),
        steamId: steamIdSchema.optional(),
        ipAddress: ipv4Schema.optional(),
        sandbox: z.boolean().optional(),
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
          data: await microTxnClient.getUserInfo({
            appid: args.appid,
            steamId: resolveOptionalSteamId(args.steamId, authManager),
            ipAddress: args.ipAddress,
            sandbox: args.sandbox,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_microtxn_query_txn',
    {
      title: 'Query Steam MicroTxn transaction',
      description: 'Query the status of a Steam microtransaction order or transaction.',
      inputSchema: {
        appid: z.number().int().positive(),
        orderId: uint64Schema.optional(),
        transId: uint64Schema.optional(),
        sandbox: z.boolean().optional(),
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
          data: await microTxnClient.queryTxn(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}

function resolveSteamId(explicitSteamId: string | undefined, authManager: SteamOpenIdAuthManager): string {
  const steamId = resolveOptionalSteamId(explicitSteamId, authManager);

  if (!steamId) {
    throw new SteamMcpError({
      code: 'authentication_required',
      message: 'steamId is required when no Steam OpenID session is authenticated.',
    });
  }

  return steamId;
}

function resolveOptionalSteamId(
  explicitSteamId: string | undefined,
  authManager: SteamOpenIdAuthManager,
): string | undefined {
  if (explicitSteamId) {
    return explicitSteamId;
  }

  const [steamId] = authManager.getStatus().authenticatedSteamIds;
  return steamId;
}
