import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const auditDoc = readFileSync(new URL('../docs/official-webapi-audit.md', import.meta.url), 'utf8');
const usageDoc = readFileSync(new URL('../docs/usage.md', import.meta.url), 'utf8');
const designDoc = readFileSync(new URL('../docs/design.md', import.meta.url), 'utf8');

describe('official Steam Web API audit documentation', () => {
  it('lists the currently tracked Steamworks-documented Web API interfaces', () => {
    const steamworksDocInterfaces = [
      'IBroadcastService',
      'ICheatReportingService',
      'ICloudService',
      'IEconMarketService',
      'IEconService',
      'IGameInventory',
      'IGameNotificationsService',
      'IGameServersService',
      'IInventoryService',
      'ILobbyMatchmakingService',
      'IPartnerFinancialsService',
      'IPlayerService',
      'IPublishedFileService',
      'ISiteLicenseService',
      'ISteamApps',
      'ISteamCommunity',
      'ISteamEconomy',
      'ISteamGameServerStats',
      'ISteamLeaderboards',
      'ISteamMicroTxn',
      'ISteamMicroTxnSandbox',
      'ISteamNews',
      'ISteamPublishedItemSearch',
      'ISteamPublishedItemVoting',
      'ISteamRemoteStorage',
      'ISteamUserAuth',
      'ISteamUser',
      'ISteamUserStats',
      'ISteamWebAPIUtil',
      'IStoreService',
      'IWorkshopService',
    ];

    for (const interfaceName of steamworksDocInterfaces) {
      expect(auditDoc).toContain(`\`${interfaceName}\``);
      expect(auditDoc).toContain(`https://partner.steamgames.com/doc/webapi/${interfaceName}`);
    }
  });

  it('lists tracked public catalog interfaces without dedicated Steamworks doc pages', () => {
    const publicCatalogInterfaces = [
      'IAuthenticationService',
      'IClientStats_1046930',
      'IContentServerDirectoryService',
      'IGCVersion_<appid>',
      'IHelpRequestLogsService',
      'IPortal2Leaderboards_620',
      'ISteamBroadcast',
      'ISteamDirectory',
      'ISteamUserOAuth',
      'ITFSystem_440',
      'IWishlistService',
    ];

    for (const interfaceName of publicCatalogInterfaces) {
      expect(auditDoc).toContain(`\`${interfaceName}\``);
      expect(auditDoc).toContain('https://api.steampowered.com/ISteamWebAPIUtil/GetSupportedAPIList/v1/?format=json');
    }
  });

  it('keeps explicit notes for sensitive or write-capable methods', () => {
    const excludedMethods = [
      'SetAppBuildLive',
      'StartAssetTransaction',
      'FinalizeAssetTransaction',
      'StartTrade',
      'RefundTxn',
      'ReportAbuse',
      'AddItem',
      'ConsumeItem',
      'ModifyItems',
      'UpdateItemDefs',
      'HistoryExecuteCommands',
      'CancelAppListingsForUser',
      'ReportCheatData',
      'RequestPlayerGameBan',
      'SetUserStatsForGame',
      'SetItemPaymentRules',
      'BeginAuthSessionViaCredentials',
      'BeginAuthSessionViaQR',
      'UpdateAuthSessionWithSteamGuardCode',
      'PollAuthSessionStatus',
      'ReportEvent',
      'UploadUserApplicationLog',
      'GetApplicationLogDemand',
      'RecordOfflinePlaytime',
      'ViewerHeartbeat',
    ];

    for (const methodName of excludedMethods) {
      expect(auditDoc).toContain(methodName);
    }
  });

  it('documents user authorization boundaries for private data', () => {
    expect(auditDoc).toContain('Steam OpenID proves control of a SteamID');
    expect(auditDoc).toContain('A user-provided Steam Web API key');
    expect(auditDoc).toContain('Steam OAuth is supported');
    expect(auditDoc).toContain('Official wishlist reads and public Store wishlist JSON only');
    expect(auditDoc).toContain('does not use Steam credentials, browser cookies, or private wishlist scraping');
  });

  it('documents authorized user library and wishlist query paths', () => {
    const expectedUsageEntries = [
      'Authorized User Query Examples',
      'steam_get_owned_games',
      'steam_get_official_wishlist',
      'steam_get_official_wishlist_sorted_filtered',
      'steam_get_authorized_user_overview',
      'steam://me/overview',
      'steam://me/owned-games',
      'steam://me/wishlist',
      'steam://me/recently-played',
    ];

    for (const entry of expectedUsageEntries) {
      expect(usageDoc).toContain(entry);
    }
  });

  it('keeps the Chinese design document readable and current', () => {
    const expectedDesignEntries = [
      'Steam MCP Server 设计方案',
      '授权模型',
      '默认安全策略',
      'MCP Tools',
      'MCP Resources',
      'steam://me/overview',
      'npm run audit:steam-catalog',
    ];

    for (const entry of expectedDesignEntries) {
      expect(designDoc).toContain(entry);
    }

    expect(designDoc).not.toContain('璁');
    expect(designDoc).not.toContain('鈥');
  });
});
