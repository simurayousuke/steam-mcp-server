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

## Data Boundaries

- Player Web API tools, including summaries, owned games, recently played games, friend lists, ban status, achievements, and stats, require a Web API key and are still limited by Steam privacy settings.
- `steam_get_owned_games` can use `appidsFilter` to restrict a library query to specific Steam appids.
- Publisher-only tools, including user group list queries, require `STEAM_PUBLISHER_KEY`; they are read-only in this server and are kept separate from user Web API keys.
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
