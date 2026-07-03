# Usage

## Install

```bash
npm install
npm run build
```

Run the server over stdio:

```bash
npm start
```

The package exposes a `steam-mcp-server` binary for stdio after build or package installation.

Run the server over Streamable HTTP:

```bash
npm run start:http
```

The HTTP endpoint defaults to `http://127.0.0.1:3000/mcp`. Override the bind address with `STEAM_HTTP_HOST` and `STEAM_HTTP_PORT`. The package also exposes a `steam-mcp-server-http` binary.

## MCP Client Configuration

Use the built entrypoint as a stdio MCP server:

```json
{
  "mcpServers": {
    "steam": {
      "command": "node",
      "args": ["D:/projects/steam-mcp-server/dist/index.js"],
      "env": {
        "STEAM_DEFAULT_COUNTRY": "US",
        "STEAM_DEFAULT_LANGUAGE": "en"
      }
    }
  }
}
```

Use the built HTTP entrypoint when your MCP client supports Streamable HTTP:

```text
http://127.0.0.1:3000/mcp
```

For player Web API tools, either set `STEAM_WEB_API_KEY` in the client environment or call `steam_auth_set_web_api_key` after the server starts.

## Authentication Flow

1. Call `steam_auth_start`.
2. Open the returned `loginUrl` in a browser.
3. Steam redirects to the local callback URL.
4. Call `steam_auth_status` to confirm the authenticated SteamID.

If the browser cannot reach the local callback server, copy the final callback URL and pass it to `steam_auth_complete`.

OpenID proves SteamID ownership. It does not grant broad private-data access.

By default OpenID session state is kept only in memory. Set `STEAM_AUTH_SESSION_DIR` to persist authenticated SteamID state across server restarts. The session file stores OpenID status and SteamID metadata only; it does not store Steam passwords, browser cookies, Web API keys, or OAuth tokens.

## Authorized User Overview

After `steam_auth_status` shows an authenticated SteamID, call `steam_get_authorized_user_overview` to fetch a combined read-only snapshot for that user.

By default the overview attempts to include:

- player profile summary
- owned games
- recently played games
- official wishlist
- official wishlist item count
- followed games
- followed game count

Profile, owned games, and recently played games require a Steam Web API key from `STEAM_WEB_API_KEY` or `steam_auth_set_web_api_key`. Wishlist and followed-game sections only return data Steam exposes for that user. If one section is private, missing, or lacks required credentials, the overview returns an error for that section while preserving the other sections.

## Authorized User Query Examples

After `steam_auth_status` confirms an authenticated SteamID, tools that accept an optional `steamId` can target the authorized user by omitting `steamId`.

Fetch the authorized user's visible game library:

```json
{
  "name": "steam_get_owned_games",
  "arguments": {
    "includeAppInfo": true,
    "includePlayedFreeGames": true
  }
}
```

Fetch the authorized user's official wishlist:

```json
{
  "name": "steam_get_official_wishlist",
  "arguments": {}
}
```

Fetch a paginated official wishlist view:

```json
{
  "name": "steam_get_official_wishlist_sorted_filtered",
  "arguments": {
    "startIndex": 0,
    "pageSize": 25,
    "context": {
      "country_code": "US",
      "language": "en"
    },
    "filters": {}
  }
}
```

Fetch the combined read-only overview:

```json
{
  "name": "steam_get_authorized_user_overview",
  "arguments": {
    "ownedGamesIncludeAppInfo": true,
    "ownedGamesIncludePlayedFreeGames": true
  }
}
```

Add optional authenticated-user sections when you need a richer snapshot:

```json
{
  "name": "steam_get_authorized_user_overview",
  "arguments": {
    "includeSteamLevel": true,
    "includeBadges": true,
    "includeFriends": true,
    "includePlayerBans": true,
    "includeFollowedGames": true,
    "includeFollowedGamesCount": true,
    "achievementAppids": [620],
    "statsAppids": [440],
    "gameLanguage": "en"
  }
}
```

MCP clients that prefer resources can read the same authenticated profile through `steam://me`, for example `steam://me/overview`, `steam://me/owned-games`, `steam://me/wishlist`, `steam://me/recently-played`, `steam://me/followed-games`, `steam://me/bans`, `steam://me/apps/620/achievements`, and `steam://me/apps/620/stats`.

Catalog-aware clients can read Steam Web API discovery data through `steam://api/coverage`, `steam://api/interfaces`, `steam://api/interfaces/ISteamNews/methods`, and `steam://api/interfaces/ISteamNews/methods/GetNewsForApp/versions/2`.

## Web API Key Flow

Use `steam_auth_set_web_api_key` to store a key in memory for the running MCP server process:

```json
{
  "webApiKey": "..."
}
```

The key is not returned in tool output. `steam_auth_status` only reports whether a key is available and whether the source is `environment`, `session`, or `none`.

Use `steam_auth_clear_web_api_key` to clear the session key. Environment keys are not modified.

## Financial Key Flow

Partner financial tools require `STEAM_FINANCIAL_KEY`, a dedicated Financial API Group key from Steamworks. This key is separate from `STEAM_PUBLISHER_KEY` and is never returned in tool output.

## OAuth Token Flow

Steam Cloud and some Workshop OAuth APIs require a Steam OAuth client ID issued by Valve. Set `STEAM_OAUTH_CLIENT_ID`, then call `steam_oauth_start` and open the returned `loginUrl`.

Steam returns OAuth tokens in the redirect URL fragment. If your MCP client cannot capture the fragment automatically, copy the full redirected URL and pass it to `steam_oauth_complete`.

Use `steam_oauth_set_access_token` only when you already obtained a Steam OAuth token through another trusted flow. The token is stored in memory only and is not returned in tool output. Use `steam_oauth_clear_access_token` to clear it.

## Data Boundaries

- Player Web API tools, including summaries, owned games, recently played games, friend lists, ban status, achievements, and stats, require a Web API key and are still limited by Steam privacy settings.
- `steam_get_cheating_reports` requires `STEAM_PUBLISHER_KEY` and reads `ICheatReportingService/GetCheatingReports` only; report creation, ban requests, ban removal, and secure-session start/end APIs are not exposed.
- `steam_cloud_enumerate_user_files` requires a Steam OAuth access token with `read_cloud`; Cloud upload, delete, and batch mutation APIs are not exposed.
- `steam_get_trade_history`, `steam_get_trade_offers`, `steam_get_trade_offer`, and `steam_get_trade_offers_summary` require a Web API key for the account being inspected; trade mutation endpoints are not exposed.
- `steam_get_market_eligibility`, `steam_get_market_asset_id`, and `steam_get_market_popular` require `STEAM_PUBLISHER_KEY`; market listing cancellation is not exposed.
- `steam_get_store_app_list` requires a Web API key and uses the current `IStoreService/GetAppList` endpoint instead of the deprecated `ISteamApps/GetAppList`.
- `steam_get_asset_class_info` and `steam_get_asset_prices` require a Web API key and expose read-only Steam Economy metadata and price data; transaction/trade endpoints are not exposed.
- `steam_economy_can_trade`, `steam_get_exported_assets_for_user`, and `steam_get_market_prices` require `STEAM_PUBLISHER_KEY`; Economy asset transaction and trade initiation endpoints are not exposed.
- `steam_get_game_server_account_public_info`, `steam_get_server_steam_ids_by_ip`, and `steam_get_server_ips_by_steam_id` require a Web API key; game server account-list and login-token endpoints are not exposed because they can reveal or operate on server login credentials.
- `steam_get_game_notification_sessions` and `steam_get_game_notification_session_details` require `STEAM_PUBLISHER_KEY`; game notification create, update, request, and delete APIs are not exposed because they change user-visible notification state.
- `steam_get_game_inventory_history_command_details`, `steam_get_game_inventory_user_history`, and `steam_get_game_inventory_asset_history` require `STEAM_PUBLISHER_KEY`; history command execution and item definition updates are not exposed.
- `steam_get_inventory_service_inventory`, `steam_get_inventory_item_defs`, `steam_get_inventory_price_sheet`, and `steam_get_inventory_quantity` require `STEAM_PUBLISHER_KEY` with Economy permissions; inventory mutation methods such as add, consume, exchange, consolidate, and modify are not exposed.
- `steam_get_lobby_data` requires `STEAM_PUBLISHER_KEY`; lobby creation and user removal are not exposed.
- `steam_microtxn_get_report`, `steam_microtxn_get_user_agreement_info`, `steam_microtxn_get_user_info`, and `steam_microtxn_query_txn` require `STEAM_PUBLISHER_KEY` with Microtransaction permissions. Pass `sandbox: true` to use `ISteamMicroTxnSandbox`; transaction initialization, finalization, refund, agreement adjustment, agreement cancellation, and agreement processing are not exposed.
- `steam_financial_get_changed_dates`, `steam_financial_get_detailed_sales`, and `steam_financial_get_app_wishlist_reporting` require `STEAM_FINANCIAL_KEY`; these tools read financial reporting data only.
- `steam_get_site_license_current_client_connections` and `steam_get_site_license_total_playtime` require `STEAM_PUBLISHER_KEY` for Steam PC Cafe site-license data.
- `steam_query_workshop_files` and `steam_get_ugc_file_details` require a Web API key; Workshop delete/update/subscribe endpoints are not exposed.
- `steam_get_owned_games` can use `appidsFilter` to restrict a library query to specific Steam appids.
- Publisher-only tools, including app beta/build/depot/server metadata, game server player stats, leaderboards, partner app lists, banned-player records, Workshop finalized contributors, Workshop item daily revenue, subscribed-file enumeration, published-item search and vote summaries, and user group list queries, require `STEAM_PUBLISHER_KEY`; they are read-only in this server and are kept separate from user Web API keys.
- `steam_authenticate_user_ticket` is intended for secure server-side validation of Steam auth tickets; do not call it from untrusted clients.
- `steam_get_official_wishlist`, `steam_get_official_wishlist_sorted_filtered`, and `steam_get_user_wishlist` read wishlist data only when Steam exposes it. Official wishlist tools use the authenticated OpenID SteamID when `steamId` is omitted. `steam_get_user_wishlist` does the same when both `steamId` and `vanityName` are omitted.
- The server does not accept Steam passwords.
- The server does not read browser cookies.
- Publisher-only or write-capable Steam APIs are not callable by default.

## MCP Resources

The server exposes dynamic JSON resources:

```text
steam://apps/{appid}
steam://apps/{appid}/news
steam://apps/{appid}/schema
steam://apps/{appid}/current-players
steam://apps/{appid}/achievements/global-percentages
steam://api/coverage
steam://api/interfaces
steam://api/interfaces/{interfaceName}/methods
steam://api/interfaces/{interfaceName}/methods/{methodName}/versions/{version}
steam://players/{steamid}
steam://players/{steamid}/owned-games
steam://players/{steamid}/wishlist
steam://players/{steamid}/wishlist/count
steam://players/{steamid}/followed-games
steam://players/{steamid}/followed-games/count
steam://players/{steamid}/apps/{appid}/playtime
steam://players/{steamid}/apps/{appid}/achievements
steam://players/{steamid}/apps/{appid}/stats
steam://players/{steamid}/recently-played
steam://players/{steamid}/bans
steam://players/{steamid}/steam-level
steam://players/{steamid}/badges
steam://players/{steamid}/badges/{badgeid}/progress
steam://players/{steamid}/friends
steam://profiles/{vanity}/wishlist
steam://me
steam://me/overview
steam://me/owned-games
steam://me/wishlist
steam://me/wishlist/count
steam://me/followed-games
steam://me/followed-games/count
steam://me/apps/{appid}/playtime
steam://me/apps/{appid}/achievements
steam://me/apps/{appid}/stats
steam://me/recently-played
steam://me/bans
steam://me/steam-level
steam://me/badges
steam://me/badges/{badgeid}/progress
steam://me/friends
```

Player library resources and `steam://apps/{appid}/schema` use official Steam Web API methods that require a Web API key from `STEAM_WEB_API_KEY` or `steam_auth_set_web_api_key`. Wishlist resources only return data Steam exposes for the target profile. Catalog resources use `ISteamWebAPIUtil/GetSupportedAPIList` and include the same generic read-only access metadata as the catalog tools.

Generic catalog calls always set `format=json`; do not pass reserved server-managed parameters such as `format` in `steam_api_call_readonly.params`.

After Steam OpenID authentication, `steam://me` resources resolve the authenticated SteamID automatically.

## Allowlisted Web API Methods

`STEAM_API_ALLOWLIST_FILE` can point to a UTF-8 text file:

```text
# one method per line
ISteamRemoteStorage.GetPublishedFileDetails.v1
```

Allowlisting is intended for official methods that are read-only in practice but blocked by the default conservative safety policy, such as specific POST query endpoints.
