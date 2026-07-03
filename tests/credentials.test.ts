import { describe, expect, it } from 'vitest';

import { SteamCredentialManager } from '../src/auth/credentials.js';

describe('SteamCredentialManager', () => {
  it('reports environment keys without exposing the key', () => {
    const manager = new SteamCredentialManager('environment-secret');

    expect(manager.getWebApiKey()).toBe('environment-secret');
    expect(manager.getStatus()).toEqual({
      hasWebApiKey: true,
      hasEnvironmentWebApiKey: true,
      hasSessionWebApiKey: false,
      webApiKeySource: 'environment',
    });
  });

  it('prefers session keys over environment keys and clears only the session key', () => {
    const manager = new SteamCredentialManager('environment-secret');

    expect(manager.setSessionWebApiKey(' session-secret ')).toMatchObject({
      hasWebApiKey: true,
      hasEnvironmentWebApiKey: true,
      hasSessionWebApiKey: true,
      webApiKeySource: 'session',
    });
    expect(manager.getWebApiKey()).toBe('session-secret');

    expect(manager.clearSessionWebApiKey()).toMatchObject({
      clearedSessionWebApiKey: true,
      hasWebApiKey: true,
      webApiKeySource: 'environment',
    });
    expect(manager.getWebApiKey()).toBe('environment-secret');
  });
});
