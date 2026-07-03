import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { toolFailure, toolSuccess } from '../common/tool-result.js';
import type { SteamUserOAuthClient } from '../steam/user-oauth-client.js';

export function registerUserOAuthTools(server: McpServer, userOAuthClient: SteamUserOAuthClient): void {
  server.registerTool(
    'steam_oauth_get_token_details',
    {
      title: 'Get Steam OAuth token details',
      description: 'Fetch ISteamUserOAuth/GetTokenDetails for the in-memory session OAuth access token.',
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
          data: await userOAuthClient.getTokenDetails(),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
