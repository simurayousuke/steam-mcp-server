# Steam MCP Server

Steam MCP Server is a planned Model Context Protocol server for Steam public data, Steam Web API data, Steam Store metadata, and user-authorized read access where Steam officially supports it.

Current status: runnable stdio MCP server with health, Steam Web API catalog, safe read-only Web API calls, Steam Store search, app details, and public wishlist tools.

The default policy is read-only. Official Steam Web API methods will be discoverable through a catalog, but protected or state-changing methods will not be callable unless they are explicitly allowlisted.

The server also exposes MCP resources for app details, app news, app stats schema, player summaries, owned games, playtime, recently played games, Steam levels, badges, badge progress, and friend lists.

## Implemented Tools

- `steam_health_check`
- `steam_auth_start`
- `steam_auth_status`
- `steam_auth_complete`
- `steam_auth_logout`
- `steam_auth_set_web_api_key`
- `steam_auth_clear_web_api_key`
- `steam_oauth_start`
- `steam_oauth_complete`
- `steam_oauth_set_access_token`
- `steam_oauth_clear_access_token`
- `steam_api_get_coverage_summary`
- `steam_api_refresh_catalog`
- `steam_api_list_interfaces`
- `steam_api_list_methods`
- `steam_api_get_method_schema`
- `steam_api_call_readonly`
- `steam_cloud_enumerate_user_files`
- `steam_resolve_vanity_url`
- `steam_get_player_summary`
- `steam_get_player_summaries`
- `steam_get_owned_games`
- `steam_get_recently_played_games`
- `steam_get_single_game_playtime`
- `steam_get_steam_level`
- `steam_get_badges`
- `steam_get_community_badge_progress`
- `steam_get_friend_list`
- `steam_get_player_bans`
- `steam_get_user_group_list`
- `steam_get_player_achievements`
- `steam_get_user_stats_for_game`
- `steam_get_news_for_app`
- `steam_get_web_api_server_info`
- `steam_get_number_of_current_players`
- `steam_get_global_achievement_percentages`
- `steam_get_servers_at_address`
- `steam_check_app_up_to_date`
- `steam_get_global_stats_for_game`
- `steam_get_schema_for_game`
- `steam_get_store_app_list`
- `steam_get_games_followed`
- `steam_get_games_followed_count`
- `steam_get_asset_class_info`
- `steam_get_asset_prices`
- `steam_get_game_server_account_public_info`
- `steam_get_server_steam_ids_by_ip`
- `steam_get_server_ips_by_steam_id`
- `steam_get_game_notification_sessions`
- `steam_get_game_notification_session_details`
- `steam_get_inventory_service_inventory`
- `steam_get_inventory_item_defs`
- `steam_get_inventory_price_sheet`
- `steam_get_inventory_quantity`
- `steam_authenticate_user_ticket`
- `steam_get_app_betas`
- `steam_get_app_builds`
- `steam_get_app_depot_versions`
- `steam_get_partner_app_list`
- `steam_get_players_banned`
- `steam_get_server_list`
- `steam_get_workshop_finalized_contributors`
- `steam_get_leaderboards_for_game`
- `steam_get_leaderboard_entries`
- `steam_get_game_server_player_stats`
- `steam_enumerate_user_subscribed_files`
- `steam_search_published_items`
- `steam_get_published_item_search_summary`
- `steam_get_published_item_vote_summary`
- `steam_get_user_published_item_vote_summary`
- `steam_check_app_ownership`
- `steam_get_publisher_app_ownership`
- `steam_get_app_price_info`
- `steam_get_deleted_steam_ids`
- `steam_get_public_inventory`
- `steam_search_apps`
- `steam_get_app_details`
- `steam_get_app_reviews`
- `steam_get_store_package`
- `steam_get_user_wishlist`
- `steam_query_workshop_files`
- `steam_get_ugc_file_details`
- `steam_get_workshop_file_details`
- `steam_get_workshop_collection_details`

`steam_get_user_wishlist` is limited to public wishlist JSON exposed by Steam Store endpoints. It does not read Steam cookies, passwords, or private wishlists.

Steam authentication uses Steam OpenID to prove ownership of a SteamID. OpenID does not grant broad private-data access by itself.

`steam_auth_set_web_api_key` stores a Steam Web API key only in memory for the running MCP server process. The key is used for Web API calls such as owned games, recently played games, achievements, and player summaries, but the key is never returned in tool output. If `steam_get_user_wishlist` is called without `steamId` or `vanityName`, the server uses the authenticated OpenID SteamID.

`STEAM_API_ALLOWLIST_FILE` can point to a UTF-8 text file with one explicitly approved method per line, using `Interface.Method.vVersion` format. This is only for Steam Web API methods that the default read-only safety policy blocks.

## Planned Runtime

- Node.js 20+
- TypeScript
- MCP over stdio first
- Optional HTTP transport after the stdio server is stable

## Initial Commands

```bash
npm install
npm run typecheck
npm run build
```

## Repository Layout

```text
src/
  auth/     Steam OpenID/OAuth callback flow and local sessions
  catalog/  Steam Web API catalog discovery and schema generation
  common/   shared errors, cache, logging, result helpers
  config/   environment parsing and runtime settings
  mcp/      MCP server bootstrap and transport wiring
  steam/    Steam Web API, Store, and Community clients
  tools/    MCP tool definitions and handlers
tests/      unit and integration tests
docs/       design and development notes
```

## References

- Usage guide: docs/usage.md
- API coverage notes: docs/api-coverage.md
- Tool reference: docs/tools.md
- Official TypeScript SDK repository: https://github.com/modelcontextprotocol/typescript-sdk
- MCP documentation: https://modelcontextprotocol.io/
- Steam Web API documentation: https://steamcommunity.com/dev
- Steamworks Web API overview: https://partner.steamgames.com/doc/webapi_overview
