import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { SteamMcpError } from '../common/errors.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamPlayerClient } from '../steam/player-client.js';

export function registerPlayerTools(
  server: McpServer,
  playerClient: SteamPlayerClient,
  authManager: SteamOpenIdAuthManager,
): void {
  server.registerTool(
    'steam_resolve_vanity_url',
    {
      title: 'Resolve Steam vanity URL',
      description: 'Resolve a Steam custom profile name to a SteamID through the official Steam Web API.',
      inputSchema: {
        vanityName: z.string().min(1),
        urlType: z.number().int().min(1).max(3).optional(),
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
          data: await playerClient.resolveVanityUrl(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_player_summary',
    {
      title: 'Get Steam player summary',
      description: 'Get a Steam player profile summary. If steamId is omitted, use the authenticated OpenID SteamID.',
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
          data: await playerClient.getPlayerSummary({
            steamId: resolveSteamId(args.steamId, authManager),
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_player_summaries',
    {
      title: 'Get Steam player summaries',
      description: 'Get Steam player profile summaries for up to 100 SteamIDs.',
      inputSchema: {
        steamIds: z.array(z.string().min(1)).min(1).max(100),
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
          data: await playerClient.getPlayerSummaries({
            steamIds: args.steamIds,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_owned_games',
    {
      title: 'Get Steam owned games',
      description: 'Get a visible Steam game library. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        steamId: z.string().min(1).optional(),
        appidsFilter: z.array(z.number().int().positive()).min(1).max(100).optional(),
        includeAppInfo: z.boolean().optional(),
        includePlayedFreeGames: z.boolean().optional(),
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
          data: await playerClient.getOwnedGames({
            steamId: resolveSteamId(args.steamId, authManager),
            appidsFilter: args.appidsFilter,
            includeAppInfo: args.includeAppInfo,
            includePlayedFreeGames: args.includePlayedFreeGames,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_recently_played_games',
    {
      title: 'Get recently played Steam games',
      description: 'Get recently played games. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        steamId: z.string().min(1).optional(),
        count: z.number().int().positive().max(100).optional(),
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
          data: await playerClient.getRecentlyPlayedGames({
            steamId: resolveSteamId(args.steamId, authManager),
            count: args.count,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_single_game_playtime',
    {
      title: 'Get Steam single game playtime',
      description: 'Get playtime for one Steam app and player. If steamId is omitted, use the authenticated OpenID SteamID.',
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
          data: await playerClient.getSingleGamePlaytime({
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
    'steam_get_steam_level',
    {
      title: 'Get Steam level',
      description: 'Get the Steam level for a player. If steamId is omitted, use the authenticated OpenID SteamID.',
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
          data: await playerClient.getSteamLevel({
            steamId: resolveSteamId(args.steamId, authManager),
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_badges',
    {
      title: 'Get Steam badges',
      description: 'Get badges owned by a Steam player. If steamId is omitted, use the authenticated OpenID SteamID.',
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
          data: await playerClient.getBadges({
            steamId: resolveSteamId(args.steamId, authManager),
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_community_badge_progress',
    {
      title: 'Get Steam community badge progress',
      description: 'Get quest progress for a Steam community badge. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        badgeid: z.number().int().positive(),
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
          data: await playerClient.getCommunityBadgeProgress({
            steamId: resolveSteamId(args.steamId, authManager),
            badgeid: args.badgeid,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_friend_list',
    {
      title: 'Get Steam friend list',
      description: 'Get a visible Steam friend list. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        steamId: z.string().min(1).optional(),
        relationship: z.string().min(1).max(32).optional(),
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
          data: await playerClient.getFriendList({
            steamId: resolveSteamId(args.steamId, authManager),
            relationship: args.relationship,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_player_bans',
    {
      title: 'Get Steam player bans',
      description: 'Get VAC, game, community, and economy ban status for one or more SteamIDs. If steamIds is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        steamIds: z.array(z.string().min(1)).min(1).max(100).optional(),
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
          data: await playerClient.getPlayerBans({
            steamIds: args.steamIds ?? [resolveSteamId(undefined, authManager)],
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_player_achievements',
    {
      title: 'Get Steam player achievements',
      description: 'Get visible achievements for a player and app. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        appid: z.number().int().positive(),
        steamId: z.string().min(1).optional(),
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
          data: await playerClient.getPlayerAchievements({
            steamId: resolveSteamId(args.steamId, authManager),
            appid: args.appid,
            language: args.language,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_user_stats_for_game',
    {
      title: 'Get Steam user stats for game',
      description: 'Get visible game stats for a player and app. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        appid: z.number().int().positive(),
        steamId: z.string().min(1).optional(),
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
          data: await playerClient.getUserStatsForGame({
            steamId: resolveSteamId(args.steamId, authManager),
            appid: args.appid,
            language: args.language,
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
