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
- `steam_oauth_start`
- `steam_oauth_complete`
- `steam_oauth_set_access_token`
- `steam_oauth_clear_access_token`

## Steam Web API Catalog

- `steam_api_get_coverage_summary`
- `steam_api_refresh_catalog`
- `steam_api_list_interfaces`
- `steam_api_list_methods`
- `steam_api_get_method_schema`
- `steam_api_call_readonly`

## Official Web API High-Level Tools

- `steam_cloud_enumerate_user_files`
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
- `steam_get_ugc_file_details`
- `steam_get_workshop_file_details`
- `steam_get_workshop_collection_details`

## Resources

- `steam://apps/{appid}`
- `steam://apps/{appid}/news`
- `steam://apps/{appid}/schema`
- `steam://players/{steamid}`
- `steam://players/{steamid}/owned-games`
- `steam://players/{steamid}/apps/{appid}/playtime`
- `steam://players/{steamid}/recently-played`
- `steam://players/{steamid}/steam-level`
- `steam://players/{steamid}/badges`
- `steam://players/{steamid}/badges/{badgeid}/progress`
- `steam://players/{steamid}/friends`

## Notes

- Tools are read-only unless they explicitly manage local MCP server authentication state.
- OpenID confirms SteamID ownership but does not grant broad private-data access.
- Web API keys can be provided through `STEAM_WEB_API_KEY` or `steam_auth_set_web_api_key`.
- Publisher-only tools require `STEAM_PUBLISHER_KEY` and are separate from user Web API keys.
- The generic `steam_api_call_readonly` tool covers additional official catalog methods that pass the safety policy.
