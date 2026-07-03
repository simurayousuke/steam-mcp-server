#!/usr/bin/env node

import { type AddressInfo } from 'node:net';
import { pathToFileURL } from 'node:url';

import { loadConfig } from './config/env.js';
import { createSteamMcpHttpServer } from './mcp/http-server.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const httpServer = createSteamMcpHttpServer();

  await new Promise<void>((resolve, reject) => {
    httpServer.server.once('error', reject);
    httpServer.server.listen(config.STEAM_HTTP_PORT, config.STEAM_HTTP_HOST, () => {
      httpServer.server.off('error', reject);
      resolve();
    });
  });

  const address = httpServer.server.address() as AddressInfo | null;
  const host = address?.address ?? config.STEAM_HTTP_HOST;
  const port = address?.port ?? config.STEAM_HTTP_PORT;
  const displayHost = host === '::' ? '[::]' : host;

  console.error(`Steam MCP HTTP server is running at http://${displayHost}:${port}${httpServer.endpoint}`);

  const shutdown = async (): Promise<void> => {
    try {
      await httpServer.close();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      console.error(message);
      process.exitCode = 1;
    }
  };

  process.once('SIGINT', () => {
    void shutdown();
  });
  process.once('SIGTERM', () => {
    void shutdown();
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
