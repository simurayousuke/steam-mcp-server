# Steam API Coverage

This server handles Steam API coverage through two layers.

## Catalog Layer

`steam_api_refresh_catalog`, `steam_api_list_interfaces`, `steam_api_list_methods`, `steam_api_get_method_schema`, and `steam_api_get_coverage_summary` use `ISteamWebAPIUtil/GetSupportedAPIList` as the source of truth for official Steam Web API metadata.

`steam_api_call_readonly` can call default-safe official methods. Methods that are POST or match risky operation names are blocked unless explicitly listed in `STEAM_API_ALLOWLIST_FILE`.

## High-Level Tool Layer

Implemented high-level tools cover:

- Steam OpenID identity verification
- Steam OAuth login URL generation, callback-fragment completion, in-memory OAuth access-token storage, and read-only Steam Cloud file enumeration with `read_cloud`
- Steam Web API catalog discovery
- Safe read-only Web API calls
- Anonymous Steam Web API server info through `ISteamWebAPIUtil/GetServerInfo`
- Public app version checks through `ISteamApps/UpToDateCheck`
- Store app list pagination through `IStoreService/GetAppList`
- Trade history, trade offers, individual trade offer, and trade offer summary reads through `IEconService`; cache flush and mutation endpoints are not exposed as high-level tools
- Market eligibility, listing asset ID, and popular market item reads through `IEconMarketService`; listing cancellation is not exposed as a high-level tool
- Public Steam Economy asset class and asset price read endpoints
- Game server account public info and server IP/SteamID lookup through `IGameServersService`; token-bearing account-list and login-token endpoints are not exposed as high-level tools
- Game notification session enumeration and session detail reads through `IGameNotificationsService`; create, update, request, and delete notification methods are not exposed as high-level tools
- Game Inventory history command details, user history, and asset history reads through `IGameInventory`; history command execution and item definition updates are not exposed as high-level tools
- Inventory Service inventory, item definition, price sheet, and quantity read endpoints when `STEAM_PUBLISHER_KEY` has Economy permissions; inventory mutation endpoints are not exposed as high-level tools
- Lobby data reads through `ILobbyMatchmakingService`; lobby creation and member removal are not exposed as high-level tools
- Microtransaction reports, user agreement info, user purchasing info, and transaction-status reads through `ISteamMicroTxn`; `sandbox` requests call `ISteamMicroTxnSandbox`
- Partner financial changed-date, detailed-sales, and wishlist-reporting reads through `IPartnerFinancialsService` when `STEAM_FINANCIAL_KEY` is configured
- Publisher-only user ticket authentication, app beta/build/depot/server metadata, game server player stats, leaderboards, partner app lists, banned-player records, Workshop finalized contributors, subscribed-file enumeration, published-item search and vote summaries, ownership, price, user group list, and deleted-SteamID read endpoints when `STEAM_PUBLISHER_KEY` is configured
- PC Cafe site-license current connection and total playtime reads through `ISiteLicenseService`
- Store search, app details, reviews, package details, and public wishlist JSON
- Player profile summaries, owned games, recently played games, single-game playtime, Steam level, badges, community badge progress, friend lists, ban status, achievements, game stats, and app stats schema
- Public Steam Community inventory
- Workshop published file search, UGC file details, published file details, and collection details

## Known Boundaries

- Steam OpenID proves SteamID ownership but does not grant broad private-data access.
- Steam OAuth access tokens are only stored in memory and are never returned in tool output.
- Private wishlists are not read through cookies or passwords.
- Steam trade tools are read-only and require the user's Web API key; trade mutations are not exposed.
- Steam Market partner tools are read-only and require `STEAM_PUBLISHER_KEY`; listing cancellation is not exposed.
- Partner financial tools require a dedicated `STEAM_FINANCIAL_KEY`; they do not reuse `STEAM_PUBLISHER_KEY`, and the key is never returned in tool output.
- Publisher-only, financial, transaction, inventory mutation, and other write-capable APIs are not callable by default.
- Game server account-list and login-token APIs are intentionally excluded from high-level tools because they expose or operate on server login credentials.
- Game notification create, update, request, and delete APIs are intentionally excluded from high-level tools because they create or mutate user-visible notification state.
- Game Inventory command execution and item definition update APIs are intentionally excluded from high-level tools because they mutate inventory state or definitions.
- Inventory Service add, consume, exchange, consolidate, and modify methods are intentionally excluded from high-level tools because they change user inventory state.
- Lobby creation and member-removal APIs are intentionally excluded from high-level tools because they mutate lobby state.
- Microtransaction initialization, finalization, refund, agreement adjustment, agreement cancellation, and agreement processing APIs are intentionally excluded from high-level tools because they create charges, capture payments, refund money, or mutate billing state.
- `STEAM_API_ALLOWLIST_FILE` is intentionally explicit and reviewed line by line.
