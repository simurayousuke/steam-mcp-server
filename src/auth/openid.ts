import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

const steamOpenIdEndpoint = new URL('https://steamcommunity.com/openid/login');
const steamClaimedIdPattern = /^https?:\/\/steamcommunity\.com\/openid\/id\/(?<steamId>\d{17})$/;

export type SteamOpenIdAuthUrlOptions = {
  returnTo: URL;
  realm: string;
};

export type SteamOpenIdVerification = {
  steamId: string;
  claimedId: string;
};

export function buildSteamOpenIdAuthUrl(options: SteamOpenIdAuthUrlOptions): URL {
  const url = new URL(steamOpenIdEndpoint);
  url.searchParams.set('openid.ns', 'http://specs.openid.net/auth/2.0');
  url.searchParams.set('openid.mode', 'checkid_setup');
  url.searchParams.set('openid.return_to', options.returnTo.toString());
  url.searchParams.set('openid.realm', options.realm);
  url.searchParams.set('openid.identity', 'http://specs.openid.net/auth/2.0/identifier_select');
  url.searchParams.set('openid.claimed_id', 'http://specs.openid.net/auth/2.0/identifier_select');
  return url;
}

export async function verifySteamOpenIdCallback(
  callbackUrl: URL,
  http: Pick<HttpJsonClient, 'postFormText'>,
): Promise<SteamOpenIdVerification> {
  const params = callbackUrl.searchParams;

  if (params.get('openid.mode') !== 'id_res') {
    throw new SteamMcpError({
      code: 'authentication_required',
      message: 'Steam OpenID callback did not contain a positive identity response.',
    });
  }

  const claimedId = params.get('openid.claimed_id');
  const match = claimedId?.match(steamClaimedIdPattern);

  if (!claimedId || !match?.groups?.steamId) {
    throw new SteamMcpError({
      code: 'authentication_required',
      message: 'Steam OpenID callback did not contain a valid SteamID claim.',
    });
  }

  const verificationForm = new URLSearchParams();

  for (const [name, value] of params) {
    if (name.startsWith('openid.')) {
      verificationForm.append(name, value);
    }
  }

  verificationForm.set('openid.mode', 'check_authentication');

  const verification = await http.postFormText(steamOpenIdEndpoint, verificationForm);

  if (!verification.includes('is_valid:true')) {
    throw new SteamMcpError({
      code: 'authentication_required',
      message: 'Steam OpenID callback verification failed.',
    });
  }

  return {
    steamId: match.groups.steamId,
    claimedId,
  };
}
