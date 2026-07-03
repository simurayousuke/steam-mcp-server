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

The package also exposes a `steam-mcp-server` binary after build or package installation.

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

For player Web API tools, either set `STEAM_WEB_API_KEY` in the client environment or call `steam_auth_set_web_api_key` after the server starts.

## Authentication Flow

1. Call `steam_auth_start`.
2. Open the returned `loginUrl` in a browser.
3. Steam redirects to the local callback URL.
4. Call `steam_auth_status` to confirm the authenticated SteamID.

If the browser cannot reach the local callback server, copy the final callback URL and pass it to `steam_auth_complete`.

OpenID proves SteamID ownership. It does not grant broad private-data access.

## Web API Key Flow

Use `steam_auth_set_web_api_key` to store a key in memory for the running MCP server process:

```json
{
  "webApiKey": "..."
}
```

The key is not returned in tool output. `steam_auth_status` only reports whether a key is available and whether the source is `environment`, `session`, or `none`.

Use `steam_auth_clear_web_api_key` to clear the session key. Environment keys are not modified.

## OAuth Token Flow

Steam Cloud and some Workshop OAuth APIs require a Steam OAuth client ID issued by Valve. Set `STEAM_OAUTH_CLIENT_ID`, then call `steam_oauth_start` and open the returned `loginUrl`.

Steam returns OAuth tokens in the redirect URL fragment. If your MCP client cannot capture the fragment automatically, copy the full redirected URL and pass it to `steam_oauth_complete`.

Use `steam_oauth_set_access_token` only when you already obtained a Steam OAuth token through another trusted flow. The token is stored in memory only and is not returned in tool output. Use `steam_oauth_clear_access_token` to clear it.

## Data Boundaries

- Player Web API tools, including summaries, owned games, recently played games, friend lists, ban status, achievements, and stats, require a Web API key and are still limited by Steam privacy settings.
- `steam_cloud_enumerate_user_files` requires a Steam OAuth access token with `read_cloud`; Cloud upload, delete, and batch mutation APIs are not exposed.
- `steam_get_store_app_list` requires a Web API key and uses the current `IStoreService/GetAppList` endpoint instead of the deprecated `ISteamApps/GetAppList`.
- `steam_get_asset_class_info` and `steam_get_asset_prices` require a Web API key and expose read-only Steam Economy metadata and price data; transaction/trade endpoints are not exposed.
- `steam_get_game_server_account_public_info`, `steam_get_server_steam_ids_by_ip`, and `steam_get_server_ips_by_steam_id` require a Web API key; game server account-list and login-token endpoints are not exposed because they can reveal or operate on server login credentials.
- `steam_get_inventory_service_inventory`, `steam_get_inventory_item_defs`, `steam_get_inventory_price_sheet`, and `steam_get_inventory_quantity` require `STEAM_PUBLISHER_KEY` with Economy permissions; inventory mutation methods such as add, consume, exchange, consolidate, and modify are not exposed.
- `steam_query_workshop_files` and `steam_get_ugc_file_details` require a Web API key; Workshop delete/update/subscribe endpoints are not exposed.
- `steam_get_owned_games` can use `appidsFilter` to restrict a library query to specific Steam appids.
- Publisher-only tools, including app beta/build/depot/server metadata, game server player stats, leaderboards, partner app lists, banned-player records, Workshop finalized contributors, subscribed-file enumeration, published-item search and vote summaries, and user group list queries, require `STEAM_PUBLISHER_KEY`; they are read-only in this server and are kept separate from user Web API keys.
- `steam_authenticate_user_ticket` is intended for secure server-side validation of Steam auth tickets; do not call it from untrusted clients.
- `steam_get_user_wishlist` reads public wishlist JSON only. If no `steamId` or `vanityName` is provided, it uses the authenticated OpenID SteamID.
- The server does not accept Steam passwords.
- The server does not read browser cookies.
- Publisher-only or write-capable Steam APIs are not callable by default.

## MCP Resources

The server exposes dynamic JSON resources:

```text
steam://apps/{appid}
steam://apps/{appid}/news
steam://apps/{appid}/schema
steam://players/{steamid}
steam://players/{steamid}/owned-games
steam://players/{steamid}/apps/{appid}/playtime
steam://players/{steamid}/recently-played
steam://players/{steamid}/steam-level
steam://players/{steamid}/badges
steam://players/{steamid}/badges/{badgeid}/progress
steam://players/{steamid}/friends
```

Player resources and `steam://apps/{appid}/schema` use official Steam Web API methods that require a Web API key from `STEAM_WEB_API_KEY` or `steam_auth_set_web_api_key`.

## Allowlisted Web API Methods

`STEAM_API_ALLOWLIST_FILE` can point to a UTF-8 text file:

```text
# one method per line
ISteamRemoteStorage.GetPublishedFileDetails.v1
```

Allowlisting is intended for official methods that are read-only in practice but blocked by the default conservative safety policy, such as specific POST query endpoints.
