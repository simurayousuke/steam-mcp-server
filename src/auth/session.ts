import { createServer, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { z } from 'zod';

import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';
import { buildSteamOpenIdAuthUrl, verifySteamOpenIdCallback } from './openid.js';

type AuthSessionStatus = 'pending' | 'authenticated' | 'failed';

export type AuthSession = {
  state: string;
  status: AuthSessionStatus;
  loginUrl: string;
  returnTo: string;
  createdAt: string;
  expiresAt: string;
  steamId?: string;
  claimedId?: string;
  error?: string;
};

export type AuthStartResult = {
  state: string;
  loginUrl: string;
  returnTo: string;
  expiresAt: string;
};

export type AuthStatusResult = {
  sessions: AuthSession[];
  authenticatedSteamIds: string[];
};

export type SteamOpenIdAuthManagerOptions = {
  host: string;
  port: number;
  http: Pick<HttpJsonClient, 'postFormText'>;
  sessionDir?: string;
  sessionTtlMs?: number;
};

export class SteamOpenIdAuthManager {
  private readonly sessions = new Map<string, AuthSession>();
  private server: Server | undefined;
  private actualPort: number | undefined;
  private readonly sessionTtlMs: number;
  private readonly sessionStore: SteamOpenIdSessionStore | undefined;

  constructor(private readonly options: SteamOpenIdAuthManagerOptions) {
    this.sessionTtlMs = options.sessionTtlMs ?? 10 * 60 * 1000;
    this.sessionStore = options.sessionDir ? new SteamOpenIdSessionStore(options.sessionDir) : undefined;

    for (const session of this.sessionStore?.load() ?? []) {
      this.sessions.set(session.state, session);
    }

    this.dropExpiredSessions();
  }

  async start(): Promise<AuthStartResult> {
    await this.ensureServer();
    const state = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTtlMs);
    const realm = this.getRealm();
    const returnTo = new URL('/auth/steam/callback', realm);
    returnTo.searchParams.set('state', state);
    const loginUrl = buildSteamOpenIdAuthUrl({
      returnTo,
      realm,
    }).toString();
    const session: AuthSession = {
      state,
      status: 'pending',
      loginUrl,
      returnTo: returnTo.toString(),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    this.sessions.set(state, session);
    this.saveSessions();

    return {
      state,
      loginUrl,
      returnTo: session.returnTo,
      expiresAt: session.expiresAt,
    };
  }

  getStatus(state?: string): AuthStatusResult {
    this.dropExpiredSessions();
    const sessions = state ? [this.getSession(state)] : [...this.sessions.values()];

    return {
      sessions,
      authenticatedSteamIds: sessions
        .filter((session) => session.status === 'authenticated' && session.steamId)
        .map((session) => session.steamId as string),
    };
  }

  async completeFromCallbackUrl(callbackUrl: string): Promise<AuthSession> {
    const url = new URL(callbackUrl);
    return this.complete(url);
  }

  async logout(): Promise<{ clearedSessions: number }> {
    const clearedSessions = this.sessions.size;
    this.sessions.clear();
    this.saveSessions();

    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server?.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
      this.server = undefined;
      this.actualPort = undefined;
    }

    return {
      clearedSessions,
    };
  }

  private async ensureServer(): Promise<void> {
    if (this.server && this.actualPort !== undefined) {
      return;
    }

    this.server = createServer((request, response) => {
      const requestUrl = new URL(request.url ?? '/', this.getRealm());

      if (request.method !== 'GET' || requestUrl.pathname !== '/auth/steam/callback') {
        response.writeHead(404, {
          'Content-Type': 'text/plain; charset=utf-8',
        });
        response.end('Not found');
        return;
      }

      this.complete(requestUrl)
        .then((session) => writeHtml(response, 200, `Steam authentication complete for ${session.steamId}.`))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          writeHtml(response, 400, `Steam authentication failed: ${escapeHtml(message)}`);
        });
    });

    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      this.server?.listen(this.options.port, this.options.host, () => {
        const address = this.server?.address();

        if (!address || typeof address === 'string') {
          reject(new Error('Steam auth callback server did not return a TCP address.'));
          return;
        }

        this.actualPort = address.port;
        resolve();
      });
    });
  }

  private async complete(callbackUrl: URL): Promise<AuthSession> {
    this.dropExpiredSessions();
    const state = callbackUrl.searchParams.get('state');

    if (!state) {
      throw new SteamMcpError({
        code: 'validation_error',
        message: 'Steam OpenID callback is missing state.',
      });
    }

    const session = this.sessions.get(state);

    if (!session) {
      throw new SteamMcpError({
        code: 'authentication_required',
        message: 'Steam OpenID state is unknown or expired.',
      });
    }

    try {
      const verification = await verifySteamOpenIdCallback(callbackUrl, this.options.http);
      const authenticated: AuthSession = {
        ...session,
        status: 'authenticated',
        steamId: verification.steamId,
        claimedId: verification.claimedId,
        error: undefined,
      };

      this.sessions.set(state, authenticated);
      this.saveSessions();
      return authenticated;
    } catch (error: unknown) {
      const failed: AuthSession = {
        ...session,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };

      this.sessions.set(state, failed);
      this.saveSessions();
      throw error;
    }
  }

  private getSession(state: string): AuthSession {
    const session = this.sessions.get(state);

    if (!session) {
      throw new SteamMcpError({
        code: 'not_found',
        message: `Steam auth session not found for state ${state}.`,
      });
    }

    return session;
  }

  private dropExpiredSessions(): void {
    const now = Date.now();
    let changed = false;

    for (const [state, session] of this.sessions) {
      if (Date.parse(session.expiresAt) <= now && session.status !== 'authenticated') {
        this.sessions.delete(state);
        changed = true;
      }
    }

    if (changed) {
      this.saveSessions();
    }
  }

  private getRealm(): string {
    const port = this.actualPort ?? this.options.port;
    return `http://${this.options.host}:${port}/`;
  }

  private saveSessions(): void {
    this.sessionStore?.save([...this.sessions.values()]);
  }
}

const authSessionSchema = z.object({
  state: z.string(),
  status: z.enum(['pending', 'authenticated', 'failed']),
  loginUrl: z.string(),
  returnTo: z.string(),
  createdAt: z.string(),
  expiresAt: z.string(),
  steamId: z.string().optional(),
  claimedId: z.string().optional(),
  error: z.string().optional(),
});

class SteamOpenIdSessionStore {
  private readonly directory: string;
  private readonly filePath: string;

  constructor(sessionDir: string) {
    this.directory = resolve(sessionDir);
    this.filePath = join(this.directory, 'openid-sessions.json');
  }

  load(): AuthSession[] {
    if (!existsSync(this.filePath)) {
      return [];
    }

    try {
      const parsed = JSON.parse(readFileSync(this.filePath, 'utf8')) as unknown;
      return z.array(authSessionSchema).parse(parsed);
    } catch (error: unknown) {
      throw new SteamMcpError({
        code: 'configuration_error',
        message: `Steam OpenID session store is not readable: ${this.filePath}`,
        details: {
          reason: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  save(sessions: AuthSession[]): void {
    try {
      mkdirSync(this.directory, {
        recursive: true,
      });
      const temporaryPath = `${this.filePath}.tmp`;
      writeFileSync(temporaryPath, `${JSON.stringify(sessions, null, 2)}\n`, {
        encoding: 'utf8',
        mode: 0o600,
      });
      renameSync(temporaryPath, this.filePath);
    } catch (error: unknown) {
      throw new SteamMcpError({
        code: 'configuration_error',
        message: `Steam OpenID session store is not writable: ${this.filePath}`,
        details: {
          reason: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}

function writeHtml(response: ServerResponse, status: number, body: string): void {
  response.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
  });
  response.end(`<!doctype html><meta charset="utf-8"><title>Steam MCP Auth</title><p>${body}</p>`);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
