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
      hasPublisherKey: false,
      hasFinancialKey: false,
      hasOAuthClientId: false,
      hasOAuthAccessToken: false,
      hasSessionOAuthAccessToken: false,
      webApiKeySource: 'environment',
    });
  });

  it('prefers session keys over environment keys and clears only the session key', () => {
    const manager = new SteamCredentialManager('environment-secret');

    expect(manager.setSessionWebApiKey(' session-secret ')).toMatchObject({
      hasWebApiKey: true,
      hasEnvironmentWebApiKey: true,
      hasSessionWebApiKey: true,
      hasPublisherKey: false,
      hasFinancialKey: false,
      hasOAuthAccessToken: false,
      webApiKeySource: 'session',
    });
    expect(manager.getWebApiKey()).toBe('session-secret');

    expect(manager.clearSessionWebApiKey()).toMatchObject({
      clearedSessionWebApiKey: true,
      hasWebApiKey: true,
      hasPublisherKey: false,
      hasFinancialKey: false,
      hasOAuthAccessToken: false,
      webApiKeySource: 'environment',
    });
    expect(manager.getWebApiKey()).toBe('environment-secret');
  });

  it('reports publisher keys without exposing the key', () => {
    const manager = new SteamCredentialManager(undefined, 'publisher-secret');

    expect(manager.getPublisherKey()).toBe('publisher-secret');
    expect(manager.getStatus()).toEqual({
      hasWebApiKey: false,
      hasEnvironmentWebApiKey: false,
      hasSessionWebApiKey: false,
      hasPublisherKey: true,
      hasFinancialKey: false,
      hasOAuthClientId: false,
      hasOAuthAccessToken: false,
      hasSessionOAuthAccessToken: false,
      webApiKeySource: 'none',
    });
  });

  it('reports financial keys without exposing the key', () => {
    const manager = new SteamCredentialManager(undefined, undefined, undefined, 'financial-secret');

    expect(manager.getFinancialKey()).toBe('financial-secret');
    expect(manager.getStatus()).toMatchObject({
      hasFinancialKey: true,
      hasPublisherKey: false,
      hasWebApiKey: false,
    });
  });

  it('stores OAuth access tokens in memory without exposing the token', () => {
    const manager = new SteamCredentialManager(undefined, undefined, 'oauth-client-id');

    expect(manager.getOAuthClientId()).toBe('oauth-client-id');
    expect(manager.setSessionOAuthAccessToken(' oauth-token ')).toMatchObject({
      hasOAuthClientId: true,
      hasOAuthAccessToken: true,
      hasSessionOAuthAccessToken: true,
    });
    expect(manager.getOAuthAccessToken()).toBe('oauth-token');

    expect(manager.clearSessionOAuthAccessToken()).toMatchObject({
      clearedSessionOAuthAccessToken: true,
      hasOAuthAccessToken: false,
      hasSessionOAuthAccessToken: false,
    });
    expect(manager.getOAuthAccessToken()).toBeUndefined();
  });
});
