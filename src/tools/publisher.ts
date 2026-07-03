import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { SteamMcpError } from '../common/errors.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamPublisherClient } from '../steam/publisher-client.js';

const appTypeFilterSchema = z.enum(['game', 'application', 'tool', 'demo', 'dlc', 'music']);
const leaderboardDataRequestSchema = z.enum(['RequestGlobal', 'RequestAroundUser', 'RequestFriends']);
const publishedItemSearchTypeSchema = z.enum(['publicationOrder', 'trend', 'vote']);
const seattleDateTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

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
    'steam_get_workshop_finalized_contributors',
    {
      title: 'Get Steam Workshop finalized contributors',
      description: 'Get finalized contributor records for one app workshop item using a publisher Web API key.',
      inputSchema: {
        appid: z.number().int().positive(),
        gameItemId: z.number().int().positive(),
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
          data: await publisherClient.getWorkshopFinalizedContributors({
            appid: args.appid,
            gameItemId: args.gameItemId,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_leaderboards_for_game',
    {
      title: 'Get Steam leaderboards for game',
      description: 'Get leaderboard definitions for one app using a publisher Web API key.',
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
          data: await publisherClient.getLeaderboardsForGame({
            appid: args.appid,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_leaderboard_entries',
    {
      title: 'Get Steam leaderboard entries',
      description:
        'Get entries from one Steam leaderboard using a publisher Web API key. For RequestAroundUser or RequestFriends, steamId defaults to the authenticated OpenID SteamID.',
      inputSchema: {
        appid: z.number().int().positive(),
        leaderboardId: z.number().int().positive(),
        rangeStart: z.number().int(),
        rangeEnd: z.number().int(),
        dataRequest: leaderboardDataRequestSchema,
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
          data: await publisherClient.getLeaderboardEntries({
            appid: args.appid,
            leaderboardId: args.leaderboardId,
            rangeStart: args.rangeStart,
            rangeEnd: args.rangeEnd,
            dataRequest: args.dataRequest,
            steamId: resolveLeaderboardSteamId(args.dataRequest, args.steamId, authManager),
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_game_server_player_stats',
    {
      title: 'Get Steam game server player stats',
      description:
        'Get game server player stats for one app and time range using a publisher Web API key. rangeStart and rangeEnd must use Steam documented Seattle local time format: YYYY-MM-DD HH:MM:SS.',
      inputSchema: {
        appid: z.number().int().positive(),
        gameId: z.string().regex(/^\d+$/),
        rangeStart: seattleDateTimeSchema,
        rangeEnd: seattleDateTimeSchema,
        maxResults: z.number().int().positive().max(1000).optional(),
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
          data: await publisherClient.getGameServerPlayerStats({
            appid: args.appid,
            gameId: args.gameId,
            rangeStart: args.rangeStart,
            rangeEnd: args.rangeEnd,
            maxResults: args.maxResults,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_enumerate_user_subscribed_files',
    {
      title: 'Enumerate Steam user subscribed files',
      description:
        'Enumerate Workshop files subscribed by a Steam user for one app using a publisher Web API key. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        appid: z.number().int().positive(),
        listType: z.number().int().nonnegative(),
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
          data: await publisherClient.enumerateUserSubscribedFiles({
            steamId: resolveSteamId(args.steamId, authManager),
            appid: args.appid,
            listType: args.listType,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_search_published_items',
    {
      title: 'Search Steam published items',
      description:
        'Search publisher-visible Steam Workshop items using ISteamPublishedItemSearch and a publisher Web API key. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        searchType: publishedItemSearchTypeSchema,
        appid: z.number().int().positive(),
        steamId: z.string().min(1).optional(),
        startIndex: z.number().int().nonnegative().optional(),
        count: z.number().int().positive().max(100).optional(),
        tags: z.array(z.string().min(1)).min(1).max(50).optional(),
        userTags: z.array(z.string().min(1)).min(1).max(50).optional(),
        hasAppAdminAccess: z.boolean().optional(),
        fileType: z.number().int().min(0).max(20).optional(),
        days: z.number().int().min(1).max(7).optional(),
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
          data: await publisherClient.searchPublishedItems({
            steamId: resolveSteamId(args.steamId, authManager),
            appid: args.appid,
            searchType: args.searchType,
            startIndex: args.startIndex,
            count: args.count,
            tags: args.tags,
            userTags: args.userTags,
            hasAppAdminAccess: args.hasAppAdminAccess,
            fileType: args.fileType,
            days: args.days,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_published_item_search_summary',
    {
      title: 'Get Steam published item search summary',
      description:
        'Get a publisher-visible Workshop search result summary using a publisher Web API key. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        appid: z.number().int().positive(),
        steamId: z.string().min(1).optional(),
        tags: z.array(z.string().min(1)).min(1).max(50).optional(),
        userTags: z.array(z.string().min(1)).min(1).max(50).optional(),
        hasAppAdminAccess: z.boolean().optional(),
        fileType: z.number().int().min(0).max(20).optional(),
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
          data: await publisherClient.getPublishedItemSearchSummary({
            steamId: resolveSteamId(args.steamId, authManager),
            appid: args.appid,
            tags: args.tags,
            userTags: args.userTags,
            hasAppAdminAccess: args.hasAppAdminAccess,
            fileType: args.fileType,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_published_item_vote_summary',
    {
      title: 'Get Steam published item vote summary',
      description:
        'Get vote summaries for Workshop items using a publisher Web API key. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        appid: z.number().int().positive(),
        publishedFileIds: z.array(z.string().regex(/^\d+$/)).min(1).max(100),
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
          data: await publisherClient.getPublishedItemVoteSummary({
            steamId: resolveSteamId(args.steamId, authManager),
            appid: args.appid,
            publishedFileIds: args.publishedFileIds,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_user_published_item_vote_summary',
    {
      title: 'Get Steam user published item vote summary',
      description:
        'Get one user vote summary for Workshop items using a publisher Web API key. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        publishedFileIds: z.array(z.string().regex(/^\d+$/)).min(1).max(100),
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
          data: await publisherClient.getUserPublishedItemVoteSummary({
            steamId: resolveSteamId(args.steamId, authManager),
            publishedFileIds: args.publishedFileIds,
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

function resolveLeaderboardSteamId(
  dataRequest: 'RequestGlobal' | 'RequestAroundUser' | 'RequestFriends',
  explicitSteamId: string | undefined,
  authManager: SteamOpenIdAuthManager,
): string | undefined {
  if (explicitSteamId || dataRequest !== 'RequestGlobal') {
    return resolveSteamId(explicitSteamId, authManager);
  }

  return undefined;
}
