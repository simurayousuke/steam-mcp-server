import { describe, expect, it } from 'vitest';

import { buildSteamOAuthLoginUrl, parseSteamOAuthCallbackUrl } from '../src/auth/oauth.js';

describe('Steam OAuth helpers', () => {
  it('builds a Steam OAuth implicit-flow login URL', () => {
    const loginUrl = new URL(
      buildSteamOAuthLoginUrl({
        clientId: 'client-id',
        state: 'state-value',
      }),
    );

    expect(loginUrl.origin).toBe('https://steamcommunity.com');
    expect(loginUrl.pathname).toBe('/oauth/login');
    expect(loginUrl.searchParams.get('response_type')).toBe('token');
    expect(loginUrl.searchParams.get('client_id')).toBe('client-id');
    expect(loginUrl.searchParams.get('state')).toBe('state-value');
    expect(loginUrl.searchParams.get('mobileminimal')).toBe('1');
  });

  it('parses an OAuth callback fragment', () => {
    expect(
      parseSteamOAuthCallbackUrl(
        'http://127.0.0.1/callback#access_token=token-value&token_type=steam&state=state-value',
        'state-value',
      ),
    ).toEqual({
      accessToken: 'token-value',
      tokenType: 'steam',
      state: 'state-value',
    });
  });

  it('rejects callbacks with a mismatched state', () => {
    expect(() =>
      parseSteamOAuthCallbackUrl(
        'http://127.0.0.1/callback#access_token=token-value&token_type=steam&state=actual',
        'expected',
      ),
    ).toThrow(/state/);
  });
});
