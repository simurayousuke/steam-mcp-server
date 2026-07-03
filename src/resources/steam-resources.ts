import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { SteamPlayerClient } from '../steam/player-client.js';
import type { SteamStoreClient } from '../steam/store-client.js';
import type { SteamWebApiClient } from '../steam/web-api-client.js';

export type SteamResourceClients = {
  playerClient: Pick<
    SteamPlayerClient,
    'getFriendList' | 'getOwnedGames' | 'getPlayerSummary' | 'getRecentlyPlayedGames'
  >;
  storeClient: Pick<SteamStoreClient, 'getAppDetails'>;
  webApiClient: Pick<SteamWebApiClient, 'getNewsForApp' | 'getSchemaForGame'>;
};

export function registerSteamResources(server: McpServer, clients: SteamResourceClients): void {
  server.registerResource(
    'steam-app',
    new ResourceTemplate('steam://apps/{appid}', { list: undefined }),
    {
      title: 'Steam app',
      description: 'Steam Store app details as JSON.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const appid = parsePositiveInteger(variableToString(variables.appid), 'appid');
      const data = await clients.storeClient.getAppDetails({ appid });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-app-news',
    new ResourceTemplate('steam://apps/{appid}/news', { list: undefined }),
    {
      title: 'Steam app news',
      description: 'Recent Steam news for an app as JSON.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const appid = parsePositiveInteger(variableToString(variables.appid), 'appid');
      const data = await clients.webApiClient.getNewsForApp({
        appid,
        count: 10,
        maxLength: 1000,
      });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-app-schema',
    new ResourceTemplate('steam://apps/{appid}/schema', { list: undefined }),
    {
      title: 'Steam app stats schema',
      description: 'Steam stats and achievement schema for an app as JSON. Requires a Steam Web API key.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const appid = parsePositiveInteger(variableToString(variables.appid), 'appid');
      const data = await clients.webApiClient.getSchemaForGame({ appid });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-player',
    new ResourceTemplate('steam://players/{steamid}', { list: undefined }),
    {
      title: 'Steam player',
      description: 'Steam player summary as JSON. Requires a Steam Web API key.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const steamId = variableToString(variables.steamid);
      const data = await clients.playerClient.getPlayerSummary({ steamId });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-player-owned-games',
    new ResourceTemplate('steam://players/{steamid}/owned-games', { list: undefined }),
    {
      title: 'Steam player owned games',
      description: 'Visible Steam game library for a player as JSON. Requires a Steam Web API key.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const steamId = variableToString(variables.steamid);
      const data = await clients.playerClient.getOwnedGames({ steamId });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-player-recently-played',
    new ResourceTemplate('steam://players/{steamid}/recently-played', { list: undefined }),
    {
      title: 'Steam player recently played games',
      description: 'Recently played Steam games for a player as JSON. Requires a Steam Web API key.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const steamId = variableToString(variables.steamid);
      const data = await clients.playerClient.getRecentlyPlayedGames({ steamId });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-player-friends',
    new ResourceTemplate('steam://players/{steamid}/friends', { list: undefined }),
    {
      title: 'Steam player friends',
      description: 'Visible Steam friend list for a player as JSON. Requires a Steam Web API key.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const steamId = variableToString(variables.steamid);
      const data = await clients.playerClient.getFriendList({ steamId });

      return jsonResource(uri, data);
    },
  );
}

function jsonResource(uri: URL, data: unknown) {
  return {
    contents: [
      {
        uri: uri.toString(),
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function variableToString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function parsePositiveInteger(value: string, name: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isSafeInteger(parsed) || parsed <= 0 || String(parsed) !== value) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
}
