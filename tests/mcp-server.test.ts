import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';

import { createSteamMcpServer } from '../src/mcp/server.js';

describe('Steam MCP server', () => {
  it('lists tools and calls the health check over MCP', async () => {
    const server = createSteamMcpServer();
    const client = new Client({
      name: 'steam-mcp-server-test-client',
      version: '0.0.0',
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    try {
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
      const tools = await client.listTools();
      const resourceTemplates = await client.listResourceTemplates();

      expect(tools.tools.map((tool) => tool.name)).toEqual(
        expect.arrayContaining([
          'steam_health_check',
          'steam_auth_start',
          'steam_auth_set_web_api_key',
          'steam_auth_clear_web_api_key',
          'steam_oauth_start',
          'steam_oauth_complete',
          'steam_oauth_set_access_token',
          'steam_oauth_clear_access_token',
          'steam_api_get_coverage_summary',
          'steam_api_list_interfaces',
          'steam_api_call_readonly',
          'steam_cloud_enumerate_user_files',
          'steam_search_apps',
          'steam_get_app_reviews',
          'steam_get_store_package',
          'steam_get_news_for_app',
          'steam_get_web_api_server_info',
          'steam_get_number_of_current_players',
          'steam_get_global_achievement_percentages',
          'steam_get_servers_at_address',
          'steam_check_app_up_to_date',
          'steam_get_global_stats_for_game',
          'steam_get_schema_for_game',
          'steam_get_store_app_list',
          'steam_get_games_followed',
          'steam_get_games_followed_count',
          'steam_get_trade_history',
          'steam_get_trade_offers',
          'steam_get_trade_offer',
          'steam_get_trade_offers_summary',
          'steam_get_market_eligibility',
          'steam_get_market_asset_id',
          'steam_get_market_popular',
          'steam_get_asset_class_info',
          'steam_get_asset_prices',
          'steam_get_game_server_account_public_info',
          'steam_get_server_steam_ids_by_ip',
          'steam_get_server_ips_by_steam_id',
          'steam_get_game_notification_sessions',
          'steam_get_game_notification_session_details',
          'steam_get_game_inventory_history_command_details',
          'steam_get_game_inventory_user_history',
          'steam_get_game_inventory_asset_history',
          'steam_get_inventory_service_inventory',
          'steam_get_inventory_item_defs',
          'steam_get_inventory_price_sheet',
          'steam_get_inventory_quantity',
          'steam_authenticate_user_ticket',
          'steam_get_app_betas',
          'steam_get_app_builds',
          'steam_get_app_depot_versions',
          'steam_get_partner_app_list',
          'steam_get_players_banned',
          'steam_get_server_list',
          'steam_get_workshop_finalized_contributors',
          'steam_get_leaderboards_for_game',
          'steam_get_leaderboard_entries',
          'steam_get_game_server_player_stats',
          'steam_enumerate_user_subscribed_files',
          'steam_search_published_items',
          'steam_get_published_item_search_summary',
          'steam_get_published_item_vote_summary',
          'steam_get_user_published_item_vote_summary',
          'steam_check_app_ownership',
          'steam_get_publisher_app_ownership',
          'steam_get_app_price_info',
          'steam_get_deleted_steam_ids',
          'steam_get_public_inventory',
          'steam_get_player_summaries',
          'steam_get_owned_games',
          'steam_get_single_game_playtime',
          'steam_get_steam_level',
          'steam_get_badges',
          'steam_get_community_badge_progress',
          'steam_get_friend_list',
          'steam_get_player_bans',
          'steam_get_user_group_list',
          'steam_get_lobby_data',
          'steam_financial_get_changed_dates',
          'steam_financial_get_detailed_sales',
          'steam_financial_get_app_wishlist_reporting',
          'steam_get_site_license_current_client_connections',
          'steam_get_site_license_total_playtime',
          'steam_query_workshop_files',
          'steam_get_ugc_file_details',
          'steam_get_workshop_file_details',
          'steam_get_workshop_collection_details',
        ]),
      );
      expect(resourceTemplates.resourceTemplates.map((resource) => resource.uriTemplate)).toEqual(
        expect.arrayContaining([
          'steam://apps/{appid}',
          'steam://apps/{appid}/news',
          'steam://apps/{appid}/schema',
          'steam://players/{steamid}',
          'steam://players/{steamid}/owned-games',
          'steam://players/{steamid}/apps/{appid}/playtime',
          'steam://players/{steamid}/recently-played',
          'steam://players/{steamid}/steam-level',
          'steam://players/{steamid}/badges',
          'steam://players/{steamid}/badges/{badgeid}/progress',
          'steam://players/{steamid}/friends',
        ]),
      );

      const result = await client.callTool({
        name: 'steam_health_check',
        arguments: {},
      });

      expect(result.structuredContent).toMatchObject({
        status: 'ok',
      });

      const setKeyResult = await client.callTool({
        name: 'steam_auth_set_web_api_key',
        arguments: {
          webApiKey: 'fake-session-key',
        },
      });
      expect(setKeyResult.structuredContent).toMatchObject({
        credentials: {
          hasWebApiKey: true,
          hasSessionWebApiKey: true,
          hasFinancialKey: false,
          hasOAuthAccessToken: false,
          webApiKeySource: 'session',
        },
      });
      expect(JSON.stringify(setKeyResult.structuredContent)).not.toContain('fake-session-key');

      const authStatus = await client.callTool({
        name: 'steam_auth_status',
        arguments: {},
      });
      expect(authStatus.structuredContent).toMatchObject({
        credentials: {
          hasWebApiKey: true,
          hasFinancialKey: false,
          hasOAuthAccessToken: false,
          webApiKeySource: 'session',
        },
      });
      expect(JSON.stringify(authStatus.structuredContent)).not.toContain('fake-session-key');

      const setOAuthResult = await client.callTool({
        name: 'steam_oauth_set_access_token',
        arguments: {
          accessToken: 'fake-oauth-token',
        },
      });
      expect(setOAuthResult.structuredContent).toMatchObject({
        credentials: {
          hasOAuthAccessToken: true,
          hasSessionOAuthAccessToken: true,
        },
      });
      expect(JSON.stringify(setOAuthResult.structuredContent)).not.toContain('fake-oauth-token');

      const wishlistWithoutIdentity = await client.callTool({
        name: 'steam_get_user_wishlist',
        arguments: {},
      });
      expect(wishlistWithoutIdentity).toMatchObject({
        isError: true,
        structuredContent: {
          error: {
            code: 'authentication_required',
          },
        },
      });

      const followedWithoutIdentity = await client.callTool({
        name: 'steam_get_games_followed',
        arguments: {},
      });
      expect(followedWithoutIdentity).toMatchObject({
        isError: true,
        structuredContent: {
          error: {
            code: 'authentication_required',
          },
        },
      });

      const bansWithoutIdentity = await client.callTool({
        name: 'steam_get_player_bans',
        arguments: {},
      });
      expect(bansWithoutIdentity).toMatchObject({
        isError: true,
        structuredContent: {
          error: {
            code: 'authentication_required',
          },
        },
      });

      const publisherToolWithoutPublisherKey = await client.callTool({
        name: 'steam_check_app_ownership',
        arguments: {
          steamId: '76561197960434622',
          appid: 620,
        },
      });
      expect(publisherToolWithoutPublisherKey).toMatchObject({
        isError: true,
        structuredContent: {
          error: {
            code: 'authorization_required',
          },
        },
      });

      const userGroupsWithoutPublisherKey = await client.callTool({
        name: 'steam_get_user_group_list',
        arguments: {
          steamId: '76561197960434622',
        },
      });
      expect(userGroupsWithoutPublisherKey).toMatchObject({
        isError: true,
        structuredContent: {
          error: {
            code: 'authorization_required',
          },
        },
      });
    } finally {
      await client.close();
      await server.close();
    }
  });
});
