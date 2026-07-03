import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamLobbyMatchmakingClient } from '../steam/lobby-matchmaking-client.js';

const uint64Schema = z.string().regex(/^\d+$/);

export function registerLobbyMatchmakingTools(server: McpServer, lobbyClient: SteamLobbyMatchmakingClient): void {
  server.registerTool(
    'steam_get_lobby_data',
    {
      title: 'Get Steam lobby data',
      description: 'Get lobby metadata and member list for one Steam lobby using a publisher key.',
      inputSchema: {
        appid: z.number().int().positive(),
        steamIdLobby: uint64Schema,
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
          data: await lobbyClient.getLobbyData(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
