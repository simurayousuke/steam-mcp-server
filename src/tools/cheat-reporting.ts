import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamCheatReportingClient } from '../steam/cheat-reporting-client.js';

const uint64Schema = z.string().regex(/^\d+$/);

export function registerCheatReportingTools(
  server: McpServer,
  cheatReportingClient: SteamCheatReportingClient,
): void {
  server.registerTool(
    'steam_get_cheating_reports',
    {
      title: 'Get Steam cheating reports',
      description:
        'Get anti-cheat reports and ban requests for one app using ICheatReportingService/GetCheatingReports.',
      inputSchema: {
        appid: z.number().int().positive(),
        timeBegin: z.number().int().nonnegative(),
        timeEnd: z.number().int().nonnegative(),
        reportIdMin: uint64Schema,
        includeReports: z.boolean().optional(),
        includeBans: z.boolean().optional(),
        steamId: uint64Schema.optional(),
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
          data: await cheatReportingClient.getCheatingReports(args),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
