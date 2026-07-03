# Steam API Coverage

This server handles Steam API coverage through two layers.

## Catalog Layer

`steam_api_refresh_catalog`, `steam_api_list_interfaces`, `steam_api_list_methods`, `steam_api_get_method_schema`, and `steam_api_get_coverage_summary` use `ISteamWebAPIUtil/GetSupportedAPIList` as the source of truth for official Steam Web API metadata.

`steam_api_call_readonly` can call default-safe official methods. Methods that are POST or match risky operation names are blocked unless explicitly listed in `STEAM_API_ALLOWLIST_FILE`.

## High-Level Tool Layer

Implemented high-level tools cover:

- Steam OpenID identity verification
- Steam Web API catalog discovery
- Safe read-only Web API calls
- Store search, app details, reviews, package details, and public wishlist JSON
- Player profile summary, owned games, recently played games, achievements, and game stats
- Public Steam Community inventory
- Workshop published file details and collection details

## Known Boundaries

- Steam OpenID proves SteamID ownership but does not grant broad private-data access.
- Private wishlists are not read through cookies or passwords.
- Publisher-only, financial, transaction, inventory mutation, and other write-capable APIs are not callable by default.
- `STEAM_API_ALLOWLIST_FILE` is intentionally explicit and reviewed line by line.
