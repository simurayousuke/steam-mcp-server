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

## Steam Web API Catalog

- `steam_api_get_coverage_summary`
- `steam_api_refresh_catalog`
- `steam_api_list_interfaces`
- `steam_api_list_methods`
- `steam_api_get_method_schema`
- `steam_api_call_readonly`

## Official Web API High-Level Tools

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

## Steam Economy

- `steam_get_asset_class_info`
- `steam_get_asset_prices`

## Publisher-Only Web API Tools

- `steam_authenticate_user_ticket`
- `steam_get_app_betas`
- `steam_get_app_builds`
- `steam_get_app_depot_versions`
- `steam_get_partner_app_list`
- `steam_get_players_banned`
- `steam_get_server_list`
- `steam_get_workshop_finalized_contributors`
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
