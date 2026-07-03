import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { SteamOpenIdAuthManager } from '../src/auth/session.js';

describe('SteamOpenIdAuthManager', () => {
  it('starts, completes, reports, and clears an OpenID session', async () => {
    const manager = new SteamOpenIdAuthManager({
      host: '127.0.0.1',
      port: 0,
      http: {
        postFormText: async () => 'is_valid:true\n',
      },
    });

    try {
      const started = await manager.start();
      expect(started.state).toHaveLength(36);
      expect(started.loginUrl).toContain('https://steamcommunity.com/openid/login');
      expect(manager.getStatus(started.state).sessions[0]?.status).toBe('pending');

      const callbackUrl = new URL(started.returnTo);
      callbackUrl.searchParams.set('openid.mode', 'id_res');
      callbackUrl.searchParams.set('openid.claimed_id', 'https://steamcommunity.com/openid/id/76561197960434622');
      callbackUrl.searchParams.set('openid.identity', 'https://steamcommunity.com/openid/id/76561197960434622');
      callbackUrl.searchParams.set('openid.sig', 'signature');
      callbackUrl.searchParams.set('openid.signed', 'signed');

      await expect(manager.completeFromCallbackUrl(callbackUrl.toString())).resolves.toMatchObject({
        status: 'authenticated',
        steamId: '76561197960434622',
      });
      expect(manager.getStatus().authenticatedSteamIds).toEqual(['76561197960434622']);

      await expect(manager.logout()).resolves.toEqual({
        clearedSessions: 1,
      });
      expect(manager.getStatus().sessions).toEqual([]);
    } finally {
      await manager.logout();
    }
  });

  it('persists authenticated OpenID sessions when a session directory is configured', async () => {
    const sessionDir = await mkdtemp(join(tmpdir(), 'steam-mcp-auth-'));
    const manager = new SteamOpenIdAuthManager({
      host: '127.0.0.1',
      port: 0,
      sessionDir,
      http: {
        postFormText: async () => 'is_valid:true\n',
      },
    });

    try {
      const started = await manager.start();
      const callbackUrl = new URL(started.returnTo);
      callbackUrl.searchParams.set('openid.mode', 'id_res');
      callbackUrl.searchParams.set('openid.claimed_id', 'https://steamcommunity.com/openid/id/76561197960434622');
      callbackUrl.searchParams.set('openid.identity', 'https://steamcommunity.com/openid/id/76561197960434622');
      callbackUrl.searchParams.set('openid.sig', 'signature');
      callbackUrl.searchParams.set('openid.signed', 'signed');

      await manager.completeFromCallbackUrl(callbackUrl.toString());

      const restored = new SteamOpenIdAuthManager({
        host: '127.0.0.1',
        port: 0,
        sessionDir,
        http: {
          postFormText: async () => 'is_valid:true\n',
        },
      });

      expect(restored.getStatus().authenticatedSteamIds).toEqual(['76561197960434622']);

      await restored.logout();
      expect(
        new SteamOpenIdAuthManager({
          host: '127.0.0.1',
          port: 0,
          sessionDir,
          http: {
            postFormText: async () => 'is_valid:true\n',
          },
        }).getStatus().sessions,
      ).toEqual([]);
    } finally {
      await manager.logout();
      await rm(sessionDir, {
        recursive: true,
        force: true,
      });
    }
  });
});
