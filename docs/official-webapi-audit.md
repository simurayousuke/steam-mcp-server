# Official Steam Web API Audit

This project treats "cover known Steam APIs" as two complementary layers:

1. The catalog layer discovers official Steam Web API metadata at runtime through `ISteamWebAPIUtil/GetSupportedAPIList`.
2. The high-level tool layer exposes stable MCP tools for common read-only workflows and intentionally leaves write-capable methods behind explicit review.

The scope of this audit is Valve's HTTP-based Steam Web API and related public Steam Store or Steam Community endpoints used by this MCP server. Native Steamworks SDK interfaces that require a game client, dedicated server process, or Steamworks runtime are outside direct MCP server coverage unless Valve also exposes an HTTP Web API endpoint.

## Coverage Policy

- Public read endpoints are eligible for high-level tools when they map to durable user workflows.
- User-private reads require an official authorization path such as OpenID identity proof, a user-provided Steam Web API key, or Steam OAuth scopes where Valve makes those scopes available.
- Publisher, financial, economy, inventory, payment, and anti-cheat reads require dedicated keys and are exposed only as read tools.
- Write, payment, moderation, entitlement mutation, inventory mutation, trade initiation, and publishing-state mutation endpoints are not exposed as high-level tools.
- `steam_api_call_readonly` can call default-safe catalog methods. Risky methods require explicit review through `STEAM_API_ALLOWLIST_FILE`.

## Interface Matrix

| Interface | High-level coverage | Deliberately excluded high-level methods | Source |
| --- | --- | --- | --- |
| `IBroadcastService` | Catalog discovery only. | Broadcast frame and metadata posting methods are write-oriented. | https://partner.steamgames.com/doc/webapi/IBroadcastService |
| `ICheatReportingService` | `steam_get_cheating_reports` covers `GetCheatingReports`. | `ReportCheatData`, `ReportPlayerCheating`, `RequestPlayerGameBan`, `RemovePlayerGameBan`, `StartSecureMultiplayerSession`, `EndSecureMultiplayerSession`, and secure-session mutation methods. | https://partner.steamgames.com/doc/webapi/ICheatReportingService |
| `ICloudService` | `steam_cloud_enumerate_user_files` covers `EnumerateUserFiles` with OAuth `read_cloud`. | Upload, delete, batch, commit, and file-write methods. | https://partner.steamgames.com/doc/webapi/ICloudService |
| `IContentServerDirectoryService` | `steam_get_cdn_for_video`, `steam_pick_content_server`, `steam_get_servers_for_steampipe`, `steam_get_client_update_hosts`, and `steam_get_depot_patch_info`. | No write methods are exposed as high-level tools. | https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/?format=json |
| `IEconMarketService` | `steam_get_market_eligibility`, `steam_get_market_asset_id`, and `steam_get_market_popular`. | `CancelAppListingsForUser` and other listing-cancellation or market-state mutation methods. | https://partner.steamgames.com/doc/webapi/IEconMarketService |
| `IEconService` | `steam_get_trade_history`, `steam_get_trade_offers`, `steam_get_trade_offer`, and `steam_get_trade_offers_summary`. | Cache flush, trade mutation, and operation endpoints are not high-level tools. | https://partner.steamgames.com/doc/webapi/IEconService |
| `IGameInventory` | `steam_get_game_inventory_history_command_details`, `steam_get_game_inventory_user_history`, and `steam_get_game_inventory_asset_history`. | `HistoryExecuteCommands` and `UpdateItemDefs`. | https://partner.steamgames.com/doc/webapi/IGameInventory |
| `IGameNotificationsService` | `steam_get_game_notification_sessions` and `steam_get_game_notification_session_details`. | Create, update, request, and delete notification methods. | https://partner.steamgames.com/doc/webapi/IGameNotificationsService |
| `IGameServersService` | `steam_get_game_server_account_public_info`, `steam_get_server_steam_ids_by_ip`, and `steam_get_server_ips_by_steam_id`. | Login-token and game-server account management methods. | https://partner.steamgames.com/doc/webapi/IGameServersService |
| `IGCVersion_<appid>` | `steam_get_gc_client_version` and `steam_get_gc_server_version` cover public app-specific Game Coordinator version interfaces such as `IGCVersion_440`, `IGCVersion_570`, and `IGCVersion_730`. | No write methods are exposed as high-level tools. | https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/?format=json |
| `IInventoryService` | `steam_get_inventory_service_inventory`, `steam_get_inventory_item_defs`, `steam_get_inventory_price_sheet`, and `steam_get_inventory_quantity`. | `AddItem`, `AddPromoItem`, `ConsumeItem`, `ExchangeItem`, `Consolidate`, and `ModifyItems`. | https://partner.steamgames.com/doc/webapi/IInventoryService |
| `ILobbyMatchmakingService` | `steam_get_lobby_data`. | Lobby creation and member-removal methods. | https://partner.steamgames.com/doc/webapi/ILobbyMatchmakingService |
| `IPartnerFinancialsService` | `steam_financial_get_changed_dates`, `steam_financial_get_detailed_sales`, and `steam_financial_get_app_wishlist_reporting`. | None currently identified as high-level writes in this interface; access still requires `STEAM_FINANCIAL_KEY`. | https://partner.steamgames.com/doc/webapi/IPartnerFinancialsService |
| `IPlayerService` | Owned games, recently played games, single-game playtime, Steam level, badges, community badge progress, friends, followed games, and followed-game count tools. | No write methods are exposed as high-level tools. | https://partner.steamgames.com/doc/webapi/IPlayerService |
| `IPortal2Leaderboards_620` | `steam_get_portal2_leaderboard_bucketized_data` covers `GetBucketizedData`. | No write methods are exposed as high-level tools. | https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/?format=json |
| `IPublishedFileService` | `steam_query_workshop_files` and `steam_get_published_file_user_vote_summary`. | `Delete` and other published-file mutation methods. | https://partner.steamgames.com/doc/webapi/IPublishedFileService |
| `ISiteLicenseService` | `steam_get_site_license_current_client_connections` and `steam_get_site_license_total_playtime`. | No write methods are exposed as high-level tools. | https://partner.steamgames.com/doc/webapi/ISiteLicenseService |
| `ISteamApps` | `steam_get_servers_at_address`, `steam_check_app_up_to_date`, `steam_get_sdr_config`, and publisher app beta/build/depot/server metadata tools. | `SetAppBuildLive` and other publishing-state changes. | https://partner.steamgames.com/doc/webapi/ISteamApps |
| `ISteamCommunity` | Catalog discovery only. | `ReportAbuse` and moderation-state writes. | https://partner.steamgames.com/doc/webapi/ISteamCommunity |
| `ISteamDirectory` | `steam_get_cm_list`, `steam_get_cm_list_for_connect`, and `steam_get_steampipe_domains`. | No write methods are exposed as high-level tools. | https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/?format=json |
| `ISteamEconomy` | `steam_get_asset_class_info`, `steam_get_asset_prices`, `steam_economy_can_trade`, `steam_get_exported_assets_for_user`, and `steam_get_market_prices`. | `StartAssetTransaction`, `FinalizeAssetTransaction`, and `StartTrade`. | https://partner.steamgames.com/doc/webapi/ISteamEconomy |
| `ISteamGameServerStats` | `steam_get_game_server_player_stats`. | No write methods are exposed as high-level tools. | https://partner.steamgames.com/doc/webapi/ISteamGameServerStats |
| `ISteamLeaderboards` | `steam_get_leaderboards_for_game` and `steam_get_leaderboard_entries`. | Score upload or leaderboard mutation methods, if present in catalog metadata, stay behind review. | https://partner.steamgames.com/doc/webapi/ISteamLeaderboards |
| `ISteamMicroTxn` | `steam_microtxn_get_report`, `steam_microtxn_get_user_agreement_info`, `steam_microtxn_get_user_info`, and `steam_microtxn_query_txn`. | `InitTxn`, `FinalizeTxn`, `RefundTxn`, agreement adjustment, agreement cancellation, and agreement processing. | https://partner.steamgames.com/doc/webapi/ISteamMicroTxn |
| `ISteamMicroTxnSandbox` | Same read tools as `ISteamMicroTxn` when the tool input sets `sandbox: true`. | Same payment and agreement mutation methods as production microtransactions. | https://partner.steamgames.com/doc/webapi/ISteamMicroTxnSandbox |
| `ISteamNews` | `steam_get_news_for_app`. | No write methods are exposed as high-level tools. | https://partner.steamgames.com/doc/webapi/ISteamNews |
| `ISteamPublishedItemSearch` | `steam_search_published_items` and `steam_get_published_item_search_summary`. | No write methods are exposed as high-level tools. | https://partner.steamgames.com/doc/webapi/ISteamPublishedItemSearch |
| `ISteamPublishedItemVoting` | `steam_get_published_item_vote_summary` and `steam_get_user_published_item_vote_summary`. | Vote mutation methods are not high-level tools. | https://partner.steamgames.com/doc/webapi/ISteamPublishedItemVoting |
| `ISteamRemoteStorage` | Subscribed-file enumeration, UGC file details, Workshop file details, and collection details. | Subscribe, unsubscribe, set-state, and file mutation methods. | https://partner.steamgames.com/doc/webapi/ISteamRemoteStorage |
| `ISteamUserOAuth` | `steam_oauth_get_token_details` covers `GetTokenDetails` for the in-memory OAuth access token. | No token-issuing method is exposed here; token acquisition stays in the explicit OAuth login flow. | https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/?format=json |
| `ISteamUserAuth` | `steam_authenticate_user_ticket`. | Lower-level encrypted login-key authentication flows are not a high-level MCP login path. | https://partner.steamgames.com/doc/webapi/ISteamUserAuth |
| `ISteamUser` | Player summaries, vanity URL resolution, friend list, player bans, user group list, and deleted SteamID reads. | No write methods are exposed as high-level tools. | https://partner.steamgames.com/doc/webapi/ISteamUser |
| `ISteamUserStats` | Global achievement percentages, player achievements, user game stats, global stats, schema, current-player count, and leaderboard tools. | `SetUserStatsForGame` and any score/stat mutation methods. | https://partner.steamgames.com/doc/webapi/ISteamUserStats |
| `ISteamWebAPIUtil` | `steam_get_web_api_server_info`, `steam_api_refresh_catalog`, `steam_api_list_interfaces`, `steam_api_list_methods`, `steam_api_get_method_schema`, and `steam_api_get_coverage_summary`. | None. This interface is the catalog and health source. | https://partner.steamgames.com/doc/webapi/ISteamWebAPIUtil |
| `IStoreService` | `steam_get_store_app_list`, `steam_get_games_followed`, `steam_get_games_followed_count`, and `steam_get_recommended_tags_for_user`. | No write methods are exposed as high-level tools. | https://partner.steamgames.com/doc/webapi/IStoreService |
| `ITFSystem_440` | `steam_get_tf2_world_status` covers `GetWorldStatus`. | No write methods are exposed as high-level tools. | https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/?format=json |
| `IWishlistService` | `steam_get_official_wishlist` and `steam_get_official_wishlist_item_count` cover `GetWishlist` and `GetWishlistItemCount`. | `GetWishlistSortedFiltered` is available through catalog discovery, but its complex message parameters need a dedicated schema pass before becoming a high-level tool. | https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/?format=json |
| `IWorkshopService` | `steam_get_workshop_finalized_contributors` and `steam_get_workshop_item_daily_revenue`. | `SetItemPaymentRules` and `PopulateItemDescriptions`. | https://partner.steamgames.com/doc/webapi/IWorkshopService |

## Public Store and Community Endpoints

These are not part of `GetSupportedAPIList`, but they are important for the user's requested workflows:

| Area | High-level coverage | Boundary |
| --- | --- | --- |
| Steam Store search and app metadata | `steam_search_apps`, `steam_get_app_details`, `steam_get_app_reviews`, and `steam_get_store_package`. | Public Store endpoint stability is lower than documented Web API interfaces, so handlers normalize errors and avoid authenticated scraping. |
| Public wishlists | `steam_get_official_wishlist`, `steam_get_official_wishlist_item_count`, and `steam_get_user_wishlist`. | Official wishlist reads and public Store wishlist JSON only. The server does not use Steam credentials, browser cookies, or private wishlist scraping. |
| Public community inventory | `steam_get_public_inventory`. | Public inventory only, subject to the user's Steam privacy settings. |

## Authorization Notes

- Steam OpenID proves control of a SteamID, but it does not grant private-data scopes.
- A user-provided Steam Web API key can improve access to player-related Web API calls, but Steam privacy settings still apply.
- Steam OAuth is supported for official OAuth flows and scopes such as `read_cloud`; OAuth access tokens are stored only in memory.
- Publisher APIs require `STEAM_PUBLISHER_KEY`, and partner financial APIs require `STEAM_FINANCIAL_KEY`.
- Sensitive keys and tokens are never returned in MCP tool output.
