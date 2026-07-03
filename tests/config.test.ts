import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config/env.js';

describe('loadConfig', () => {
  it('applies safe defaults without exposing secrets', () => {
    const config = loadConfig({});

    expect(config.STEAM_AUTH_CALLBACK_HOST).toBe('127.0.0.1');
    expect(config.STEAM_AUTH_CALLBACK_PORT).toBe(0);
    expect(config.STEAM_DEFAULT_COUNTRY).toBe('US');
    expect(config.STEAM_DEFAULT_LANGUAGE).toBe('en');
    expect(config.STEAM_REQUEST_TIMEOUT_MS).toBe(10000);
    expect(config.STEAM_CACHE_TTL_SECONDS).toBe(300);
    expect(config.STEAM_RATE_LIMIT_RPS).toBe(2);
    expect(config.STEAM_WEB_API_KEY).toBeUndefined();
  });

  it('normalizes blank optional secrets to undefined', () => {
    const config = loadConfig({
      STEAM_WEB_API_KEY: '   ',
      STEAM_PUBLISHER_KEY: ' publisher-key ',
    });

    expect(config.STEAM_WEB_API_KEY).toBeUndefined();
    expect(config.STEAM_PUBLISHER_KEY).toBe('publisher-key');
  });
});
