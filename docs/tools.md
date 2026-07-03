# Tool Reference

## Health

- `steam_health_check`

## Authentication

- `steam_auth_start`
- `steam_auth_status`
- `steam_auth_complete`
- `steam_auth_logout`
- `steam_auth_set_web_api_key`
- `steam_auth_clear_web_api_key`
- `steam_get_authorized_user_overview`
- `steam_oauth_start`
- `steam_oauth_complete`
- `steam_oauth_set_access_token`
- `steam_oauth_clear_access_token`
- `steam_oauth_get_token_details`

## Steam Web API Catalog

- `steam_api_get_coverage_summary`
- `steam_api_refresh_catalog`
- `steam_api_list_interfaces`
- `steam_api_list_methods`
- `steam_api_get_method_schema`
- `steam_api_call_readonly`

## Official Web API High-Level Tools

- `steam_get_gc_client_version`
- `steam_get_gc_server_version`
- `steam_get_portal2_leaderboard_bucketized_data`
- `steam_get_tf2_world_status`
- `steam_get_cheating_reports`
- `steam_cloud_enumerate_user_files`
- `steam_get_cm_list`
- `steam_get_cm_list_for_connect`
- `steam_get_steampipe_domains`
- `steam_get_sdr_config`
- `steam_get_cdn_for_video`
- `steam_pick_content_server`
- `steam_get_servers_for_steampipe`
- `steam_get_client_update_hosts`
- `steam_get_depot_patch_info`
- `steam_get_news_for_app`
- `steam_get_web_api_server_info`
- `steam_get_number_of_current_players`
- `steam_get_global_achievement_percentages`
- `steam_get_servers_at_address`
- `steam_check_app_up_to_date`
- `steam_get_global_stats_for_game`
- `steam_get_schema_for_game`
- `steam_get_store_app_list`
- `steam_get_recommended_tags_for_user`
- `steam_get_games_followed`
- `steam_get_games_followed_count`
- `steam_get_trade_history`
- `steam_get_trade_offers`
- `steam_get_trade_offer`
- `steam_get_trade_offers_summary`
- `steam_get_market_eligibility`
- `steam_get_market_asset_id`
- `steam_get_market_popular`

## Steam Economy

- `steam_get_asset_class_info`
- `steam_get_asset_prices`
- `steam_economy_can_trade`
- `steam_get_exported_assets_for_user`
- `steam_get_market_prices`

## Game Servers

- `steam_get_game_server_account_public_info`
- `steam_get_server_steam_ids_by_ip`
- `steam_get_server_ips_by_steam_id`

## Game Notifications

- `steam_get_game_notification_sessions`
- `steam_get_game_notification_session_details`

## Game Inventory

- `steam_get_game_inventory_history_command_details`
- `steam_get_game_inventory_user_history`
- `steam_get_game_inventory_asset_history`

## Steam Inventory Service

- `steam_get_inventory_service_inventory`
- `steam_get_inventory_item_defs`
- `steam_get_inventory_price_sheet`
- `steam_get_inventory_quantity`

## Publisher-Only Web API Tools

- `steam_authenticate_user_ticket`
- `steam_get_app_betas`
- `steam_get_app_builds`
- `steam_get_app_depot_versions`
- `steam_get_partner_app_list`
- `steam_get_players_banned`
- `steam_get_server_list`
- `steam_get_workshop_finalized_contributors`
- `steam_get_workshop_item_daily_revenue`
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
- `steam_get_user_group_list`

## Player Data

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
- `steam_get_player_achievements`
- `steam_get_user_stats_for_game`

## Steam Store

- `steam_search_apps`
- `steam_get_app_details`
- `steam_get_app_reviews`
- `steam_get_store_package`
- `steam_get_official_wishlist`
- `steam_get_official_wishlist_sorted_filtered`
- `steam_get_official_wishlist_item_count`
- `steam_get_user_wishlist`

## Steam Community

- `steam_get_public_inventory`

## Steam Lobby Matchmaking

- `steam_get_lobby_data`

## Steam MicroTxn

- `steam_microtxn_get_report`
- `steam_microtxn_get_user_agreement_info`
- `steam_microtxn_get_user_info`
- `steam_microtxn_query_txn`

## Partner Financials

- `steam_financial_get_changed_dates`
- `steam_financial_get_detailed_sales`
- `steam_financial_get_app_wishlist_reporting`

## Steam Site License

- `steam_get_site_license_current_client_connections`
- `steam_get_site_license_total_playtime`

## Steam Workshop

- `steam_query_workshop_files`
- `steam_get_published_file_user_vote_summary`
- `steam_get_ugc_file_details`
- `steam_get_workshop_file_details`
- `steam_get_workshop_collection_details`

## Resources

- `steam://apps/{appid}`
- `steam://apps/{appid}/news`
- `steam://apps/{appid}/schema`
- `steam://api/coverage`
- `steam://api/interfaces`
- `steam://api/interfaces/{interfaceName}/methods`
- `steam://api/interfaces/{interfaceName}/methods/{methodName}/versions/{version}`
- `steam://players/{steamid}`
- `steam://players/{steamid}/owned-games`
- `steam://players/{steamid}/wishlist`
- `steam://players/{steamid}/wishlist/count`
- `steam://players/{steamid}/followed-games`
- `steam://players/{steamid}/followed-games/count`
- `steam://players/{steamid}/apps/{appid}/playtime`
- `steam://players/{steamid}/apps/{appid}/achievements`
- `steam://players/{steamid}/apps/{appid}/stats`
- `steam://players/{steamid}/recently-played`
- `steam://players/{steamid}/bans`
- `steam://players/{steamid}/steam-level`
- `steam://players/{steamid}/badges`
- `steam://players/{steamid}/badges/{badgeid}/progress`
- `steam://players/{steamid}/friends`
- `steam://profiles/{vanity}/wishlist`
- `steam://me`
- `steam://me/overview`
- `steam://me/owned-games`
- `steam://me/wishlist`
- `steam://me/wishlist/count`
- `steam://me/followed-games`
- `steam://me/followed-games/count`
- `steam://me/apps/{appid}/playtime`
- `steam://me/apps/{appid}/achievements`
- `steam://me/apps/{appid}/stats`
- `steam://me/recently-played`
- `steam://me/bans`
- `steam://me/steam-level`
- `steam://me/badges`
- `steam://me/badges/{badgeid}/progress`
- `steam://me/friends`

## Notes

- Tools are read-only unless they explicitly manage local MCP server authentication state.
- OpenID confirms SteamID ownership but does not grant broad private-data access.
- Web API keys can be provided through `STEAM_WEB_API_KEY` or `steam_auth_set_web_api_key`.
- Publisher-only tools require `STEAM_PUBLISHER_KEY` and are separate from user Web API keys.
- The generic `steam_api_call_readonly` tool covers additional official catalog methods that pass the safety policy. Use `steam_api_list_methods`, `steam_api_get_method_schema`, or the `steam://api/...` catalog resources to inspect `access.callableByGenericReadOnlyTool`, required user parameters, secret parameters, reserved server-managed parameters, and allowlist status.
