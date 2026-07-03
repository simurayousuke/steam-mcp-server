import { describe, expect, it } from 'vitest';

import { classifyReadonlySafety } from '../src/catalog/safety.js';

describe('classifyReadonlySafety', () => {
  it('allows ordinary GET methods', () => {
    expect(
      classifyReadonlySafety({
        interfaceName: 'ISteamNews',
        name: 'GetNewsForApp',
        version: 2,
        httpMethod: 'GET',
        parameters: [],
      }),
    ).toEqual({
      allowed: true,
      reasons: [],
    });
  });

  it('blocks non-GET methods and dangerous verbs', () => {
    const decision = classifyReadonlySafety({
      interfaceName: 'IEconMarketService',
      name: 'CancelAppListingsForUser',
      version: 1,
      httpMethod: 'POST',
      parameters: [],
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toHaveLength(2);
  });

  it('blocks authentication service methods even when they use GET', () => {
    const decision = classifyReadonlySafety({
      interfaceName: 'IAuthenticationService',
      name: 'GetPasswordRSAPublicKey',
      version: 1,
      httpMethod: 'GET',
      parameters: [],
    });

    expect(decision).toMatchObject({
      allowed: false,
      reasons: [expect.stringContaining('Steam authentication flows')],
    });
  });

  it('blocks known GET methods with side effects', () => {
    const decision = classifyReadonlySafety({
      interfaceName: 'ISteamBroadcast',
      name: 'ViewerHeartbeat',
      version: 1,
      httpMethod: 'GET',
      parameters: [],
    });

    expect(decision).toMatchObject({
      allowed: false,
      reasons: [expect.stringContaining('side effects despite using GET')],
    });
  });
});
