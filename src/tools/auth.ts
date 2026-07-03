import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamCredentialManager } from '../auth/credentials.js';
import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { toolFailure, toolSuccess } from '../common/tool-result.js';

export function registerAuthTools(
  server: McpServer,
  authManager: SteamOpenIdAuthManager,
  credentialManager: SteamCredentialManager,
): void {
  server.registerTool(
    'steam_auth_start',
    {
      title: 'Start Steam OpenID authentication',
      description: 'Create a Steam OpenID login URL and start the local callback server.',
      annotations: {
        readOnlyHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        return toolSuccess({
          data: await authManager.start(),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_auth_status',
    {
      title: 'Get Steam authentication status',
      description: 'Return pending and authenticated Steam OpenID sessions.',
      inputSchema: {
        state: z.string().min(1).optional(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        return toolSuccess({
          data: {
            ...authManager.getStatus(args.state),
            credentials: credentialManager.getStatus(),
          },
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_auth_set_web_api_key',
    {
      title: 'Set session Steam Web API key',
      description: 'Store a Steam Web API key in memory for this MCP server process. The key is never returned in tool output.',
      inputSchema: {
        webApiKey: z.string().min(1),
      },
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        return toolSuccess({
          data: {
            credentials: credentialManager.setSessionWebApiKey(args.webApiKey),
          },
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_auth_clear_web_api_key',
    {
      title: 'Clear session Steam Web API key',
      description: 'Clear the in-memory Steam Web API key set through this MCP session.',
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        return toolSuccess({
          data: {
            credentials: credentialManager.clearSessionWebApiKey(),
          },
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_auth_complete',
    {
      title: 'Complete Steam OpenID authentication manually',
      description: 'Verify a copied Steam OpenID callback URL when the local browser callback cannot reach the MCP server.',
      inputSchema: {
        callbackUrl: z.string().url(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        return toolSuccess({
          data: await authManager.completeFromCallbackUrl(args.callbackUrl),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_auth_logout',
    {
      title: 'Clear Steam authentication sessions',
      description: 'Clear local Steam OpenID authentication sessions and stop the callback server.',
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      try {
        return toolSuccess({
          data: await authManager.logout(),
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );
}
