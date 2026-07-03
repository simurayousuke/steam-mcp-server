import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

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

function getStructuredContent(result: Awaited<ReturnType<Client['callTool']>>): Record<string, unknown> {
  if (!('structuredContent' in result) || result.structuredContent === undefined) {
    throw new Error('steam_health_check did not return structured content.');
  }

  return result.structuredContent;
}

function assertIncludes(actual: string[], expected: string[], label: string): void {
  const missing = expected.filter((value) => !actual.includes(value));

  if (missing.length > 0) {
    throw new Error(`Missing ${label}: ${missing.join(', ')}`);
  }
}

async function main(): Promise<void> {
  const entrypoint = resolve('dist/index.js');

  if (!existsSync(entrypoint)) {
    throw new Error('dist/index.js does not exist. Run npm.cmd run build before npm.cmd run smoke:stdio.');
  }

  const client = new Client({
    name: 'steam-mcp-stdio-smoke',
    version: '0.0.0',
  });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entrypoint],
    cwd: process.cwd(),
    env: getInheritedEnvironment({
      STEAM_DEFAULT_COUNTRY: 'US',
      STEAM_DEFAULT_LANGUAGE: 'en',
    }),
    stderr: 'pipe',
  });
  const stderrChunks: string[] = [];

  transport.stderr?.on('data', (chunk: Buffer | string) => {
    stderrChunks.push(chunk.toString());
  });

  try {
    await client.connect(transport);

    const tools = await client.listTools();
    const resources = await client.listResources();
    const resourceTemplates = await client.listResourceTemplates();
    const healthCheck = await client.callTool({
      name: 'steam_health_check',
      arguments: {},
    });
    const structuredContent = getStructuredContent(healthCheck);

    if (structuredContent.status !== 'ok') {
      throw new Error(`steam_health_check returned status ${String(structuredContent.status)}`);
    }

    assertIncludes(
      tools.tools.map((tool) => tool.name),
      [
        'steam_health_check',
        'steam_auth_start',
        'steam_get_authorized_user_overview',
        'steam_get_owned_games',
        'steam_get_official_wishlist',
        'steam_get_official_wishlist_sorted_filtered',
        'steam_api_list_interfaces',
      ],
      'tools',
    );
    assertIncludes(
      resources.resources.map((resource) => resource.uri),
      [
        'steam://api/coverage',
        'steam://api/interfaces',
        'steam://api/server-info',
        'steam://me',
        'steam://me/overview',
        'steam://me/owned-games',
        'steam://me/wishlist',
        'steam://me/wishlist/count',
        'steam://me/followed-games',
        'steam://me/followed-games/count',
      ],
      'resources',
    );
    assertIncludes(
      resourceTemplates.resourceTemplates.map((resource) => resource.uriTemplate),
      [
        'steam://apps/{appid}/current-players',
        'steam://apps/{appid}/achievements/global-percentages',
        'steam://players/{steamid}/owned-games',
        'steam://api/interfaces/{interfaceName}/methods',
        'steam://players/{steamid}/wishlist',
        'steam://players/{steamid}/followed-games',
        'steam://profiles/{vanity}/wishlist',
        'steam://me/apps/{appid}/playtime',
        'steam://me/apps/{appid}/achievements',
        'steam://me/apps/{appid}/stats',
      ],
      'resource templates',
    );

    console.log(
      JSON.stringify(
        {
          status: 'ok',
          toolCount: tools.tools.length,
          resourceCount: resources.resources.length,
          resourceTemplateCount: resourceTemplates.resourceTemplates.length,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const stderr = stderrChunks.join('').trim();

    if (stderr.length > 0) {
      console.error(stderr);
    }

    throw error;
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
