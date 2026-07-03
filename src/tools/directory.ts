import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamDirectoryClient } from '../steam/directory-client.js';

export function registerDirectoryTools(server: McpServer, directoryClient: SteamDirectoryClient): void {
  server.registerTool(
    'steam_get_cm_list',
    {
      title: 'Get Steam connection manager list',
      description: 'Fetch ISteamDirectory/GetCMList for Steam connection manager endpoints.',
      inputSchema: {
        cellId: z.number().int().min(0),
        maxCount: z.number().int().positive().optional(),
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
          data: await directoryClient.getCmList(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_cm_list_for_connect',
    {
      title: 'Get Steam connection manager list for connect',
      description: 'Fetch ISteamDirectory/GetCMListForConnect for Steam connection manager endpoints.',
      inputSchema: {
        cellId: z.number().int().min(0).optional(),
        cmType: z.string().min(1).optional(),
        realm: z.string().min(1).optional(),
        maxCount: z.number().int().positive().optional(),
        qosLevel: z.number().int().min(0).optional(),
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
          data: await directoryClient.getCmListForConnect(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_steampipe_domains',
    {
      title: 'Get SteamPipe domains',
      description: 'Fetch ISteamDirectory/GetSteamPipeDomains.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        return toolSuccess({
          data: await directoryClient.getSteamPipeDomains(),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_sdr_config',
    {
      title: 'Get Steam Datagram Relay config',
      description: 'Fetch ISteamApps/GetSDRConfig for an appid.',
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
          data: await directoryClient.getSdrConfig(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_cdn_for_video',
    {
      title: 'Get Steam CDN for video',
      description: 'Fetch IContentServerDirectoryService/GetCDNForVideo.',
      inputSchema: {
        propertyType: z.number().int().min(0),
        clientIp: z.string().min(1),
        clientRegion: z.string().min(1),
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
          data: await directoryClient.getCdnForVideo(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_pick_content_server',
    {
      title: 'Pick Steam content server',
      description: 'Fetch IContentServerDirectoryService/PickSingleContentServer.',
      inputSchema: {
        propertyType: z.number().int().min(0),
        cellId: z.number().int().min(0),
        clientIp: z.string().min(1),
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
          data: await directoryClient.pickSingleContentServer(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_servers_for_steampipe',
    {
      title: 'Get servers for SteamPipe',
      description: 'Fetch IContentServerDirectoryService/GetServersForSteamPipe.',
      inputSchema: {
        cellId: z.number().int().min(0),
        maxServers: z.number().int().positive().optional(),
        ipOverride: z.string().min(1).optional(),
        launcherType: z.number().int().min(0).optional(),
        ipv6Public: z.string().min(1).optional(),
        currentConnections: z.record(z.unknown()).optional(),
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
          data: await directoryClient.getServersForSteamPipe(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_client_update_hosts',
    {
      title: 'Get Steam client update hosts',
      description: 'Fetch IContentServerDirectoryService/GetClientUpdateHosts.',
      inputSchema: {
        cachedSignature: z.string().optional(),
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
          data: await directoryClient.getClientUpdateHosts(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_depot_patch_info',
    {
      title: 'Get Steam depot patch info',
      description: 'Fetch IContentServerDirectoryService/GetDepotPatchInfo.',
      inputSchema: {
        appid: z.number().int().positive(),
        depotid: z.number().int().positive(),
        sourceManifestId: z.string().min(1),
        targetManifestId: z.string().min(1),
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
          data: await directoryClient.getDepotPatchInfo(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
