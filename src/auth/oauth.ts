import { SteamMcpError } from '../common/errors.js';

export type SteamOAuthLoginUrlOptions = {
  clientId: string;
  state: string;
  mobileMinimal?: boolean;
};

export type SteamOAuthCallbackResult = {
  accessToken: string;
  tokenType?: string;
  state?: string;
};

export function buildSteamOAuthLoginUrl(options: SteamOAuthLoginUrlOptions): string {
  const clientId = options.clientId.trim();

  if (!clientId) {
    throw new SteamMcpError({
      code: 'configuration_error',
      message: 'STEAM_OAUTH_CLIENT_ID is required to start Steam OAuth.',
    });
  }

  const url = new URL('https://steamcommunity.com/oauth/login');
  url.searchParams.set('response_type', 'token');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('state', options.state);

  if (options.mobileMinimal ?? true) {
    url.searchParams.set('mobileminimal', '1');
  }

  return url.toString();
}

export function parseSteamOAuthCallbackUrl(callbackUrl: string, expectedState?: string): SteamOAuthCallbackResult {
  const url = new URL(callbackUrl);
  const fragment = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;

  if (!fragment) {
    throw new SteamMcpError({
      code: 'validation_error',
      message: 'Steam OAuth callback URL is missing the fragment that contains access_token.',
    });
  }

  const params = new URLSearchParams(fragment);
  const error = params.get('error');

  if (error) {
    throw new SteamMcpError({
      code: 'authentication_required',
      message: `Steam OAuth authorization failed: ${error}.`,
    });
  }

  const accessToken = params.get('access_token')?.trim();

  if (!accessToken) {
    throw new SteamMcpError({
      code: 'validation_error',
      message: 'Steam OAuth callback URL fragment is missing access_token.',
    });
  }

  const state = params.get('state') ?? undefined;

  if (expectedState !== undefined && state !== expectedState) {
    throw new SteamMcpError({
      code: 'authentication_required',
      message: 'Steam OAuth callback state does not match the expected state.',
    });
  }

  return {
    accessToken,
    tokenType: params.get('token_type') ?? undefined,
    state,
  };
}
