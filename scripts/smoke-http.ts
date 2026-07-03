import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

function getInheritedEnvironment(overrides: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') {
      env[key] = value;
    }
  }

  return {
    ...env,
    ...overrides,
  };
}

function waitForEndpoint(child: ChildProcessWithoutNullStreams): Promise<string> {
  return new Promise((resolveEndpoint, rejectEndpoint) => {
    const chunks: string[] = [];
    const timeout = setTimeout(() => {
      rejectEndpoint(new Error(`Timed out waiting for HTTP server endpoint. stderr:\n${chunks.join('')}`));
    }, 10000);

    child.stderr.on('data', (chunk: Buffer | string) => {
      const text = chunk.toString();
      chunks.push(text);
      const match = chunks.join('').match(/Steam MCP HTTP server is running at (http:\/\/[^\s]+)/);

      if (match) {
        clearTimeout(timeout);
        resolveEndpoint(match[1]);
      }
    });

    child.once('exit', (code, signal) => {
      clearTimeout(timeout);
      rejectEndpoint(new Error(`HTTP server exited before readiness. code=${String(code)} signal=${String(signal)}`));
    });
  });
}

async function stopChild(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  await new Promise<void>((resolveStop) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      resolveStop();
    }, 5000);

    child.once('exit', () => {
      clearTimeout(timeout);
      resolveStop();
    });

    child.kill('SIGTERM');
  });
}

function getStructuredContent(result: Awaited<ReturnType<Client['callTool']>>): Record<string, unknown> {
  if (!('structuredContent' in result) || result.structuredContent === undefined) {
    throw new Error('steam_health_check did not return structured content.');
  }

  return result.structuredContent;
}

async function main(): Promise<void> {
  const entrypoint = resolve('dist/http.js');

  if (!existsSync(entrypoint)) {
    throw new Error('dist/http.js does not exist. Run npm.cmd run build before npm.cmd run smoke:http.');
  }

  const child = spawn(process.execPath, [entrypoint], {
    cwd: process.cwd(),
    env: getInheritedEnvironment({
      STEAM_DEFAULT_COUNTRY: 'US',
      STEAM_DEFAULT_LANGUAGE: 'en',
      STEAM_HTTP_HOST: '127.0.0.1',
      STEAM_HTTP_PORT: '0',
    }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const client = new Client({
    name: 'steam-mcp-http-smoke',
    version: '0.0.0',
  });

  try {
    const endpoint = await waitForEndpoint(child);
    const transport = new StreamableHTTPClientTransport(new URL(endpoint));
    await client.connect(transport);

    const tools = await client.listTools();
    const resources = await client.listResources();
    const healthCheck = await client.callTool({
      name: 'steam_health_check',
      arguments: {},
    });
    const structuredContent = getStructuredContent(healthCheck);

    if (structuredContent.status !== 'ok') {
      throw new Error(`steam_health_check returned status ${String(structuredContent.status)}`);
    }

    if (!tools.tools.some((tool) => tool.name === 'steam_get_authorized_user_overview')) {
      throw new Error('Missing steam_get_authorized_user_overview over HTTP.');
    }

    if (!resources.resources.some((resource) => resource.uri === 'steam://me/overview')) {
      throw new Error('Missing steam://me/overview over HTTP.');
    }

    if (!resources.resources.some((resource) => resource.uri === 'steam://api/coverage')) {
      throw new Error('Missing steam://api/coverage over HTTP.');
    }

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          endpoint,
          toolCount: tools.tools.length,
          resourceCount: resources.resources.length,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
    await stopChild(child);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
