import { describe, expect, it } from 'vitest';

import { TtlCache } from '../src/common/cache.js';

describe('TtlCache', () => {
  it('returns values before they expire', () => {
    let now = 1000;
    const cache = new TtlCache<string>(5000, () => now);

    cache.set('appid:10', 'Counter-Strike');
    now = 5999;

    expect(cache.get('appid:10')).toBe('Counter-Strike');
  });

  it('drops values at expiration time', () => {
    let now = 1000;
    const cache = new TtlCache<string>(5000, () => now);

    cache.set('appid:10', 'Counter-Strike');
    now = 6000;

    expect(cache.get('appid:10')).toBeUndefined();
  });
});
