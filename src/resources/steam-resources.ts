import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

import { buildAuthorizedUserOverview } from '../auth/authorized-overview.js';
import type { AuthStatusResult } from '../auth/session.js';
import { SteamMcpError } from '../common/errors.js';
import type { SteamPlayerClient } from '../steam/player-client.js';
import type { SteamStoreClient } from '../steam/store-client.js';
import type { SteamWebApiClient } from '../steam/web-api-client.js';
import type { SteamWishlistClient } from '../steam/wishlist-client.js';

type SteamAuthStatusProvider = {
  getStatus: () => AuthStatusResult;
};

export type SteamResourceClients = {
  authManager: SteamAuthStatusProvider;
  playerClient: Pick<
    SteamPlayerClient,
    | 'getBadges'
    | 'getCommunityBadgeProgress'
    | 'getFriendList'
    | 'getOwnedGames'
    | 'getPlayerAchievements'
    | 'getPlayerBans'
    | 'getPlayerSummary'
    | 'getRecentlyPlayedGames'
    | 'getSingleGamePlaytime'
    | 'getSteamLevel'
    | 'getUserStatsForGame'
  >;
  storeClient: Pick<SteamStoreClient, 'getAppDetails' | 'getPublicWishlist'>;
  webApiClient: Pick<SteamWebApiClient, 'getNewsForApp' | 'getSchemaForGame'>;
  wishlistClient: Pick<SteamWishlistClient, 'getWishlist' | 'getWishlistItemCount'>;
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
    'steam-authorized-player',
    'steam://me',
    {
      title: 'Authorized Steam player',
      description: 'Steam player summary for the authenticated OpenID SteamID as JSON. Requires a Steam Web API key.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const steamId = resolveAuthorizedSteamId(clients.authManager);
      const data = await clients.playerClient.getPlayerSummary({ steamId });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-authorized-player-overview',
    'steam://me/overview',
    {
      title: 'Authorized Steam player overview',
      description:
        'Combined read-only overview for the authenticated OpenID SteamID as JSON. Sections may contain per-source errors.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const data = await buildAuthorizedUserOverview(clients.authManager, clients.playerClient, clients.wishlistClient);

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
    'steam-authorized-player-owned-games',
    'steam://me/owned-games',
    {
      title: 'Authorized Steam player owned games',
      description: 'Visible Steam game library for the authenticated OpenID SteamID as JSON. Requires a Steam Web API key.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const steamId = resolveAuthorizedSteamId(clients.authManager);
      const data = await clients.playerClient.getOwnedGames({ steamId });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-player-wishlist',
    new ResourceTemplate('steam://players/{steamid}/wishlist', { list: undefined }),
    {
      title: 'Steam player wishlist',
      description: 'Official Steam wishlist for a player as JSON, when Steam exposes it.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const steamId = variableToString(variables.steamid);
      const data = await clients.wishlistClient.getWishlist({ steamId });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-authorized-player-wishlist',
    'steam://me/wishlist',
    {
      title: 'Authorized Steam player wishlist',
      description: 'Official Steam wishlist for the authenticated OpenID SteamID as JSON, when Steam exposes it.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const steamId = resolveAuthorizedSteamId(clients.authManager);
      const data = await clients.wishlistClient.getWishlist({ steamId });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-player-wishlist-count',
    new ResourceTemplate('steam://players/{steamid}/wishlist/count', { list: undefined }),
    {
      title: 'Steam player wishlist item count',
      description: 'Official Steam wishlist item count for a player as JSON, when Steam exposes it.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const steamId = variableToString(variables.steamid);
      const data = await clients.wishlistClient.getWishlistItemCount({ steamId });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-authorized-player-wishlist-count',
    'steam://me/wishlist/count',
    {
      title: 'Authorized Steam player wishlist item count',
      description: 'Official Steam wishlist item count for the authenticated OpenID SteamID as JSON, when Steam exposes it.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const steamId = resolveAuthorizedSteamId(clients.authManager);
      const data = await clients.wishlistClient.getWishlistItemCount({ steamId });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-profile-public-wishlist',
    new ResourceTemplate('steam://profiles/{vanity}/wishlist', { list: undefined }),
    {
      title: 'Steam profile public wishlist',
      description: 'Public Steam Store wishlist JSON for a vanity profile name.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const vanityName = variableToString(variables.vanity);
      const data = await clients.storeClient.getPublicWishlist({ vanityName });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-player-app-playtime',
    new ResourceTemplate('steam://players/{steamid}/apps/{appid}/playtime', { list: undefined }),
    {
      title: 'Steam player app playtime',
      description: 'Single-app Steam playtime for a player as JSON. Requires a Steam Web API key.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const steamId = variableToString(variables.steamid);
      const appid = parsePositiveInteger(variableToString(variables.appid), 'appid');
      const data = await clients.playerClient.getSingleGamePlaytime({ steamId, appid });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-authorized-player-app-playtime',
    new ResourceTemplate('steam://me/apps/{appid}/playtime', { list: undefined }),
    {
      title: 'Authorized Steam player app playtime',
      description: 'Single-app Steam playtime for the authenticated OpenID SteamID as JSON. Requires a Steam Web API key.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const steamId = resolveAuthorizedSteamId(clients.authManager);
      const appid = parsePositiveInteger(variableToString(variables.appid), 'appid');
      const data = await clients.playerClient.getSingleGamePlaytime({ steamId, appid });

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
    'steam-authorized-player-recently-played',
    'steam://me/recently-played',
    {
      title: 'Authorized Steam player recently played games',
      description: 'Recently played Steam games for the authenticated OpenID SteamID as JSON. Requires a Steam Web API key.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const steamId = resolveAuthorizedSteamId(clients.authManager);
      const data = await clients.playerClient.getRecentlyPlayedGames({ steamId });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-player-steam-level',
    new ResourceTemplate('steam://players/{steamid}/steam-level', { list: undefined }),
    {
      title: 'Steam player level',
      description: 'Steam level for a player as JSON. Requires a Steam Web API key.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const steamId = variableToString(variables.steamid);
      const data = await clients.playerClient.getSteamLevel({ steamId });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-authorized-player-steam-level',
    'steam://me/steam-level',
    {
      title: 'Authorized Steam player level',
      description: 'Steam level for the authenticated OpenID SteamID as JSON. Requires a Steam Web API key.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const steamId = resolveAuthorizedSteamId(clients.authManager);
      const data = await clients.playerClient.getSteamLevel({ steamId });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-player-badges',
    new ResourceTemplate('steam://players/{steamid}/badges', { list: undefined }),
    {
      title: 'Steam player badges',
      description: 'Badges owned by a Steam player as JSON. Requires a Steam Web API key.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const steamId = variableToString(variables.steamid);
      const data = await clients.playerClient.getBadges({ steamId });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-authorized-player-badges',
    'steam://me/badges',
    {
      title: 'Authorized Steam player badges',
      description: 'Badges owned by the authenticated OpenID SteamID as JSON. Requires a Steam Web API key.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const steamId = resolveAuthorizedSteamId(clients.authManager);
      const data = await clients.playerClient.getBadges({ steamId });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-player-community-badge-progress',
    new ResourceTemplate('steam://players/{steamid}/badges/{badgeid}/progress', { list: undefined }),
    {
      title: 'Steam community badge progress',
      description: 'Community badge quest progress for a Steam player as JSON. Requires a Steam Web API key.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const steamId = variableToString(variables.steamid);
      const badgeid = parsePositiveInteger(variableToString(variables.badgeid), 'badgeid');
      const data = await clients.playerClient.getCommunityBadgeProgress({ steamId, badgeid });

      return jsonResource(uri, data);
    },
  );

  server.registerResource(
    'steam-authorized-player-community-badge-progress',
    new ResourceTemplate('steam://me/badges/{badgeid}/progress', { list: undefined }),
    {
      title: 'Authorized Steam community badge progress',
      description: 'Community badge quest progress for the authenticated OpenID SteamID as JSON. Requires a Steam Web API key.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const steamId = resolveAuthorizedSteamId(clients.authManager);
      const badgeid = parsePositiveInteger(variableToString(variables.badgeid), 'badgeid');
      const data = await clients.playerClient.getCommunityBadgeProgress({ steamId, badgeid });

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

  server.registerResource(
    'steam-authorized-player-friends',
    'steam://me/friends',
    {
      title: 'Authorized Steam player friends',
      description: 'Visible Steam friend list for the authenticated OpenID SteamID as JSON. Requires a Steam Web API key.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const steamId = resolveAuthorizedSteamId(clients.authManager);
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

function resolveAuthorizedSteamId(authManager: SteamAuthStatusProvider): string {
  const [steamId] = authManager.getStatus().authenticatedSteamIds;

  if (!steamId) {
    throw new SteamMcpError({
      code: 'authentication_required',
      message: 'A Steam OpenID session is required before reading steam://me resources.',
    });
  }

  return steamId;
}
