import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamSiteLicenseClient } from '../steam/site-license-client.js';

const uint64Schema = z.string().regex(/^\d+$/);
const rfc3339UtcSchema = z.string().datetime({ offset: true });

export function registerSiteLicenseTools(server: McpServer, siteLicenseClient: SteamSiteLicenseClient): void {
  server.registerTool(
    'steam_get_site_license_current_client_connections',
    {
      title: 'Get Steam Site License current client connections',
      description: 'Get current PC Cafe site activity using a publisher Web API key. Omit siteId or pass 0 for all sites.',
      inputSchema: {
        siteId: uint64Schema.optional(),
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
          data: await siteLicenseClient.getCurrentClientConnections({
            siteId: args.siteId,
          }),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_get_site_license_total_playtime',
    {
      title: 'Get Steam Site License total playtime',
      description:
        'Get total PC Cafe playtime for one RFC 3339 UTC time range using a publisher Web API key. Omit siteId or pass 0 for all sites.',
      inputSchema: {
        startTime: rfc3339UtcSchema,
        endTime: rfc3339UtcSchema,
        siteId: uint64Schema.optional(),
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
          data: await siteLicenseClient.getTotalPlaytime(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
