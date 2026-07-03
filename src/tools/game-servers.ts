import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamGameServersClient } from '../steam/game-servers-client.js';

const steamIdSchema = z.string().regex(/^\d+$/);

export function registerGameServersTools(server: McpServer, gameServersClient: SteamGameServersClient): void {
  server.registerTool(
    'steam_get_game_server_account_public_info',
    {
      title: 'Get Steam game server account public info',
      description: 'Get public information for one Steam game server account using a Web API key.',
      inputSchema: {
        steamId: steamIdSchema,
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
          data: await gameServersClient.getAccountPublicInfo({
            steamId: args.steamId,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_server_steam_ids_by_ip',
    {
      title: 'Get Steam server SteamIDs by IP',
      description: 'Resolve Steam game server SteamIDs from one or more server IP values using a Web API key.',
      inputSchema: {
        serverIps: z.array(z.string().min(1).max(128)).min(1).max(100),
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
          data: await gameServersClient.getServerSteamIdsByIp({
            serverIps: args.serverIps,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_server_ips_by_steam_id',
    {
      title: 'Get Steam server IPs by SteamID',
      description: 'Resolve Steam game server IP addresses from one or more server SteamIDs using a Web API key.',
      inputSchema: {
        serverSteamIds: z.array(steamIdSchema).min(1).max(100),
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
          data: await gameServersClient.getServerIpsBySteamId({
            serverSteamIds: args.serverSteamIds,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
