import { z } from 'zod';

import { SteamMcpError } from '../common/errors.js';

const optionalIntegerString = z
  .string()
  .trim()
  .regex(/^\d+$/)
  .transform((value) => Number.parseInt(value, 10));

const optionalSecret = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

const envSchema = z.object({
  STEAM_WEB_API_KEY: optionalSecret,
  STEAM_PUBLISHER_KEY: optionalSecret,
  STEAM_FINANCIAL_KEY: optionalSecret,
  STEAM_OAUTH_CLIENT_ID: optionalSecret,
  STEAM_OAUTH_CLIENT_SECRET: optionalSecret,
  STEAM_OAUTH_REDIRECT_URI: optionalSecret,
  STEAM_AUTH_CALLBACK_HOST: z.string().trim().default('127.0.0.1'),
  STEAM_AUTH_CALLBACK_PORT: optionalIntegerString.default('0'),
  STEAM_AUTH_SESSION_DIR: optionalSecret,
  STEAM_HTTP_HOST: z.string().trim().default('127.0.0.1'),
  STEAM_HTTP_PORT: optionalIntegerString.default('3000'),
  STEAM_API_ALLOWLIST_FILE: optionalSecret,
  STEAM_DEFAULT_COUNTRY: z.string().trim().min(2).default('US'),
  STEAM_DEFAULT_LANGUAGE: z.string().trim().min(2).default('en'),
  STEAM_REQUEST_TIMEOUT_MS: optionalIntegerString.default('10000'),
  STEAM_CACHE_TTL_SECONDS: optionalIntegerString.default('300'),
  STEAM_RATE_LIMIT_RPS: optionalIntegerString.default('2'),
});

export type SteamMcpConfig = z.infer<typeof envSchema> & {
  userAgent: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SteamMcpConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    throw new SteamMcpError({
      code: 'configuration_error',
      message: 'Invalid Steam MCP server configuration.',
      details: {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }

  return {
    ...parsed.data,
    userAgent: 'steam-mcp-server/0.1.0',
  };
}
