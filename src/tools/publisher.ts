import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { SteamMcpError } from '../common/errors.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamPublisherClient } from '../steam/publisher-client.js';

const appTypeFilterSchema = z.enum(['game', 'application', 'tool', 'demo', 'dlc', 'music']);

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
    'steam_get_app_betas',
    {
      title: 'Get Steam app betas',
      description: 'Get beta branch metadata for one app using a publisher Web API key.',
      inputSchema: {
        appid: z.number().int().positive(),
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
          data: await publisherClient.getAppBetas({
            appid: args.appid,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_app_builds',
    {
      title: 'Get Steam app builds',
      description: 'Get build history for one app using a publisher Web API key.',
      inputSchema: {
        appid: z.number().int().positive(),
        count: z.number().int().positive().max(1000).optional(),
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
          data: await publisherClient.getAppBuilds({
            appid: args.appid,
            count: args.count,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_app_depot_versions',
    {
      title: 'Get Steam app depot versions',
      description: 'Get depot versions for one app using a publisher Web API key.',
      inputSchema: {
        appid: z.number().int().positive(),
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
          data: await publisherClient.getAppDepotVersions({
            appid: args.appid,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_partner_app_list',
    {
      title: 'Get Steam partner app list',
      description: 'Get appids associated with the configured publisher Web API key.',
      inputSchema: {
        typeFilter: z.array(appTypeFilterSchema).min(1).max(6).optional(),
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
          data: await publisherClient.getPartnerAppList({
            typeFilter: args.typeFilter,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_players_banned',
    {
      title: 'Get Steam players banned',
      description: 'Get banned player records for one app using a publisher Web API key.',
      inputSchema: {
        appid: z.number().int().positive(),
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
          data: await publisherClient.getPlayersBanned({
            appid: args.appid,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_server_list',
    {
      title: 'Get Steam server list',
      description: 'Get Steam server records using a publisher Web API key.',
      inputSchema: {
        filter: z.string().min(1).max(1000).optional(),
        limit: z.number().int().positive().max(10000).optional(),
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
          data: await publisherClient.getServerList({
            filter: args.filter,
            limit: args.limit,
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

  server.registerTool(
    'steam_get_user_group_list',
    {
      title: 'Get Steam user group list',
      description:
        'Get visible Steam groups for a player using a publisher Web API key. If steamId is omitted, use the authenticated OpenID SteamID.',
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
          data: await publisherClient.getUserGroupList({
            steamId: resolveSteamId(args.steamId, authManager),
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
