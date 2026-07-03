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
- `steam_get_number_of_current_players`
- `steam_get_global_achievement_percentages`
- `steam_get_servers_at_address`
- `steam_get_global_stats_for_game`
- `steam_get_games_followed`
- `steam_get_games_followed_count`

## Player Data

- `steam_resolve_vanity_url`
- `steam_get_player_summary`
- `steam_get_owned_games`
- `steam_get_recently_played_games`
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

- `steam_get_workshop_file_details`
- `steam_get_workshop_collection_details`

## Resources

- `steam://apps/{appid}`
- `steam://apps/{appid}/news`
- `steam://players/{steamid}`

## Notes

- Tools are read-only unless they explicitly manage local MCP server authentication state.
- OpenID confirms SteamID ownership but does not grant broad private-data access.
- Web API keys can be provided through `STEAM_WEB_API_KEY` or `steam_auth_set_web_api_key`.
- The generic `steam_api_call_readonly` tool covers additional official catalog methods that pass the safety policy.
