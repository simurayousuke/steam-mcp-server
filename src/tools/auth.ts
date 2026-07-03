import { randomUUID } from 'node:crypto';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { SteamCredentialManager } from '../auth/credentials.js';
import { buildSteamOAuthLoginUrl, parseSteamOAuthCallbackUrl } from '../auth/oauth.js';
import type { SteamOpenIdAuthManager } from '../auth/session.js';
import { SteamMcpError } from '../common/errors.js';
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
    'steam_oauth_start',
    {
      title: 'Start Steam OAuth authorization',
      description:
        'Create a Steam OAuth login URL for the configured STEAM_OAUTH_CLIENT_ID. Complete it with steam_oauth_complete because Steam returns the token in the URL fragment.',
      inputSchema: {
        state: z.string().min(1).optional(),
        mobileMinimal: z.boolean().optional(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const clientId = credentialManager.getOAuthClientId();

        if (!clientId) {
          throw new SteamMcpError({
            code: 'configuration_error',
            message: 'STEAM_OAUTH_CLIENT_ID is required to start Steam OAuth.',
          });
        }

        const state = args.state ?? randomUUID();

        return toolSuccess({
          data: {
            state,
            loginUrl: buildSteamOAuthLoginUrl({
              clientId,
              state,
              mobileMinimal: args.mobileMinimal,
            }),
          },
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_oauth_complete',
    {
      title: 'Complete Steam OAuth authorization manually',
      description: 'Store the OAuth access token from a copied Steam OAuth redirect URL in memory for this MCP server process.',
      inputSchema: {
        callbackUrl: z.string().url(),
        expectedState: z.string().min(1).optional(),
      },
      annotations: {
        readOnlyHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (args) => {
      try {
        const callback = parseSteamOAuthCallbackUrl(args.callbackUrl, args.expectedState);

        return toolSuccess({
          data: {
            oauth: {
              state: callback.state,
              tokenType: callback.tokenType,
            },
            credentials: credentialManager.setSessionOAuthAccessToken(callback.accessToken),
          },
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_oauth_set_access_token',
    {
      title: 'Set session Steam OAuth access token',
      description: 'Store a Steam OAuth access token in memory for this MCP server process. The token is never returned in tool output.',
      inputSchema: {
        accessToken: z.string().min(1),
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
            credentials: credentialManager.setSessionOAuthAccessToken(args.accessToken),
          },
        });
      } catch (error: unknown) {
        return toolFailure(error);
      }
    },
  );

  server.registerTool(
    'steam_oauth_clear_access_token',
    {
      title: 'Clear session Steam OAuth access token',
      description: 'Clear the in-memory Steam OAuth access token set through this MCP session.',
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
            credentials: credentialManager.clearSessionOAuthAccessToken(),
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
