import { describe, expect, it } from 'vitest';

import { resolveAuthenticatedSteamId } from '../src/tools/authorized-user.js';

describe('authorized user overview helpers', () => {
  it('returns the first authenticated SteamID', () => {
    expect(resolveAuthenticatedSteamId(['76561197960434622', '76561198000000000'])).toBe('76561197960434622');
  });

  it('requires an authenticated Steam OpenID session', () => {
    expect(() => resolveAuthenticatedSteamId([])).toThrow('Steam OpenID session is required');
  });
});
