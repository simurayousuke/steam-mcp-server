import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { SteamMcpError } from '../common/errors.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamGameNotificationsClient } from '../steam/game-notifications-client.js';

const steamIdSchema = z.string().regex(/^\d+$/);
const sessionIdSchema = z.string().regex(/^\d+$/);

export function registerGameNotificationsTools(
  server: McpServer,
  gameNotificationsClient: SteamGameNotificationsClient,
  authManager: SteamOpenIdAuthManager,
): void {
  server.registerTool(
    'steam_get_game_notification_sessions',
    {
      title: 'Get Steam game notification sessions',
      description:
        'Enumerate game notification sessions for one Steam user using a publisher key. If steamId is omitted, use the authenticated OpenID SteamID.',
      inputSchema: {
        steamId: steamIdSchema.optional(),
        appid: z.number().int().positive().optional(),
        includeAllUserMessages: z.boolean().optional(),
        includeAuthUserMessage: z.boolean().optional(),
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
          data: await gameNotificationsClient.enumerateSessionsForApp({
            steamId: resolveSteamId(args.steamId, authManager),
            appid: args.appid,
            includeAllUserMessages: args.includeAllUserMessages,
            includeAuthUserMessage: args.includeAuthUserMessage,
            language: args.language,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_game_notification_session_details',
    {
      title: 'Get Steam game notification session details',
      description: 'Get details for one or more game notification sessions using a publisher key.',
      inputSchema: {
        appid: z.number().int().positive(),
        sessionIds: z.array(sessionIdSchema).min(1).max(100),
        includeAllUserMessages: z.boolean().optional(),
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
          data: await gameNotificationsClient.getSessionDetailsForApp(args),
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
