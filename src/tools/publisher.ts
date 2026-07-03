import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { SteamMcpError } from '../common/errors.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamPublisherClient } from '../steam/publisher-client.js';

export function registerPublisherTools(
  server: McpServer,
  publisherClient: SteamPublisherClient,
  authManager: SteamOpenIdAuthManager,
): void {
  server.registerTool(
    'steam_authenticate_user_ticket',
    {
      title: 'Authenticate Steam user ticket',
      description: 'Validate a Steam auth ticket for one app using a publisher Web API key.',
      inputSchema: {
        appid: z.number().int().positive(),
        ticket: z.string().regex(/^(?:[0-9a-fA-F]{2})+$/),
        identity: z.string().min(1).optional(),
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
          data: await publisherClient.authenticateUserTicket({
            appid: args.appid,
            ticket: args.ticket,
            identity: args.identity,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_check_app_ownership',
    {
      title: 'Check Steam app ownership',
      description:
        'Check whether a Steam user owns one app using a publisher Web API key. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        appid: z.number().int().positive(),
        steamId: z.string().min(1).optional(),
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
          data: await publisherClient.checkAppOwnership({
            steamId: resolveSteamId(args.steamId, authManager),
            appid: args.appid,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_publisher_app_ownership',
    {
      title: 'Get Steam publisher app ownership',
      description:
        'Get app ownership records for one Steam user using a publisher Web API key. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        steamId: z.string().min(1).optional(),
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
          data: await publisherClient.getPublisherAppOwnership({
            steamId: resolveSteamId(args.steamId, authManager),
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_app_price_info',
    {
      title: 'Get Steam app price info',
      description:
        'Get price information for up to 100 appids for one Steam user using a publisher Web API key. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        appids: z.array(z.number().int().positive()).min(1).max(100),
        steamId: z.string().min(1).optional(),
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
          data: await publisherClient.getAppPriceInfo({
            steamId: resolveSteamId(args.steamId, authManager),
            appids: args.appids,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_deleted_steam_ids',
    {
      title: 'Get deleted SteamIDs',
      description: 'Page through deleted SteamIDs visible to a publisher Web API key.',
      inputSchema: {
        rowVersion: z.string().regex(/^\d+$/),
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
          data: await publisherClient.getDeletedSteamIds({
            rowVersion: args.rowVersion,
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
