# Steam MCP Server

Steam MCP Server is a planned Model Context Protocol server for Steam public data, Steam Web API data, Steam Store metadata, and user-authorized read access where Steam officially supports it.

Current status: runnable stdio MCP server with health, Steam Web API catalog, safe read-only Web API calls, Steam Store search, app details, and public wishlist tools.

The default policy is read-only. Official Steam Web API methods will be discoverable through a catalog, but protected or state-changing methods will not be callable unless they are explicitly allowlisted.

## Implemented Tools

- `steam_health_check`
- `steam_auth_start`
- `steam_auth_status`
- `steam_auth_complete`
- `steam_auth_logout`
- `steam_api_get_coverage_summary`
- `steam_api_refresh_catalog`
- `steam_api_list_interfaces`
- `steam_api_list_methods`
- `steam_api_get_method_schema`
- `steam_api_call_readonly`
- `steam_resolve_vanity_url`
- `steam_get_player_summary`
- `steam_get_owned_games`
- `steam_get_recently_played_games`
- `steam_get_player_achievements`
- `steam_get_user_stats_for_game`
- `steam_get_public_inventory`
- `steam_search_apps`
- `steam_get_app_details`
- `steam_get_app_reviews`
- `steam_get_store_package`
- `steam_get_user_wishlist`
- `steam_get_workshop_file_details`
- `steam_get_workshop_collection_details`

`steam_get_user_wishlist` is limited to public wishlist JSON exposed by Steam Store endpoints. It does not read Steam cookies, passwords, or private wishlists.

Steam authentication uses Steam OpenID to prove ownership of a SteamID. OpenID does not grant broad private-data access by itself.

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

- Official TypeScript SDK repository: https://github.com/modelcontextprotocol/typescript-sdk
- MCP documentation: https://modelcontextprotocol.io/
- Steam Web API documentation: https://steamcommunity.com/dev
- Steamworks Web API overview: https://partner.steamgames.com/doc/webapi_overview
