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
});
