import { describe, expect, it } from 'vitest';

import { buildSteamOpenIdAuthUrl, verifySteamOpenIdCallback } from '../src/auth/openid.js';

describe('Steam OpenID helpers', () => {
  it('builds a Steam OpenID login URL', () => {
    const returnTo = new URL('http://127.0.0.1:8765/auth/steam/callback?state=abc');
    const url = buildSteamOpenIdAuthUrl({
      returnTo,
      realm: 'http://127.0.0.1:8765/',
    });

    expect(url.origin).toBe('https://steamcommunity.com');
    expect(url.pathname).toBe('/openid/login');
    expect(url.searchParams.get('openid.mode')).toBe('checkid_setup');
    expect(url.searchParams.get('openid.return_to')).toBe(returnTo.toString());
    expect(url.searchParams.get('openid.realm')).toBe('http://127.0.0.1:8765/');
  });

  it('verifies a positive Steam OpenID callback', async () => {
    let submittedMode: string | undefined;
    const callbackUrl = new URL('http://127.0.0.1:8765/auth/steam/callback?state=abc');
    callbackUrl.searchParams.set('openid.mode', 'id_res');
    callbackUrl.searchParams.set('openid.claimed_id', 'https://steamcommunity.com/openid/id/76561197960434622');
    callbackUrl.searchParams.set('openid.identity', 'https://steamcommunity.com/openid/id/76561197960434622');
    callbackUrl.searchParams.set('openid.sig', 'signature');
    callbackUrl.searchParams.set('openid.signed', 'signed');

    const verification = await verifySteamOpenIdCallback(callbackUrl, {
      postFormText: async (_url, form) => {
        submittedMode = form.get('openid.mode') ?? undefined;
        return 'ns:http://specs.openid.net/auth/2.0\nis_valid:true\n';
      },
    });

    expect(submittedMode).toBe('check_authentication');
    expect(verification).toEqual({
      steamId: '76561197960434622',
      claimedId: 'https://steamcommunity.com/openid/id/76561197960434622',
    });
  });

  it('rejects callbacks Steam does not validate', async () => {
    const callbackUrl = new URL('http://127.0.0.1:8765/auth/steam/callback?state=abc');
    callbackUrl.searchParams.set('openid.mode', 'id_res');
    callbackUrl.searchParams.set('openid.claimed_id', 'https://steamcommunity.com/openid/id/76561197960434622');

    await expect(
      verifySteamOpenIdCallback(callbackUrl, {
        postFormText: async () => 'is_valid:false\n',
      }),
    ).rejects.toMatchObject({
      code: 'authentication_required',
    });
  });
});
