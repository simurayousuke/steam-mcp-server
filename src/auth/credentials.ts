export type WebApiKeySource = 'environment' | 'session' | 'none';

export type CredentialStatus = {
  hasWebApiKey: boolean;
  hasEnvironmentWebApiKey: boolean;
  hasSessionWebApiKey: boolean;
  hasPublisherKey: boolean;
  hasFinancialKey: boolean;
  hasOAuthClientId: boolean;
  hasOAuthAccessToken: boolean;
  hasSessionOAuthAccessToken: boolean;
  webApiKeySource: WebApiKeySource;
};

export class SteamCredentialManager {
  private sessionWebApiKey: string | undefined;
  private sessionOAuthAccessToken: string | undefined;

  constructor(
    private readonly environmentWebApiKey: string | undefined,
    private readonly environmentPublisherKey: string | undefined = undefined,
    private readonly environmentOAuthClientId: string | undefined = undefined,
    private readonly environmentFinancialKey: string | undefined = undefined,
  ) {}

  getWebApiKey(): string | undefined {
    return this.sessionWebApiKey ?? this.environmentWebApiKey;
  }

  getPublisherKey(): string | undefined {
    return this.environmentPublisherKey;
  }

  getFinancialKey(): string | undefined {
    return this.environmentFinancialKey;
  }

  getOAuthClientId(): string | undefined {
    return this.environmentOAuthClientId;
  }

  getOAuthAccessToken(): string | undefined {
    return this.sessionOAuthAccessToken;
  }

  setSessionWebApiKey(webApiKey: string): CredentialStatus {
    this.sessionWebApiKey = webApiKey.trim();
    return this.getStatus();
  }

  setSessionOAuthAccessToken(accessToken: string): CredentialStatus {
    this.sessionOAuthAccessToken = accessToken.trim();
    return this.getStatus();
  }

  clearSessionWebApiKey(): { clearedSessionWebApiKey: boolean } & CredentialStatus {
    const clearedSessionWebApiKey = this.sessionWebApiKey !== undefined;
    this.sessionWebApiKey = undefined;

    return {
      clearedSessionWebApiKey,
      ...this.getStatus(),
    };
  }

  clearSessionOAuthAccessToken(): { clearedSessionOAuthAccessToken: boolean } & CredentialStatus {
    const clearedSessionOAuthAccessToken = this.sessionOAuthAccessToken !== undefined;
    this.sessionOAuthAccessToken = undefined;

    return {
      clearedSessionOAuthAccessToken,
      ...this.getStatus(),
    };
  }

  getStatus(): CredentialStatus {
    const hasEnvironmentWebApiKey = Boolean(this.environmentWebApiKey);
    const hasSessionWebApiKey = Boolean(this.sessionWebApiKey);
    const webApiKeySource: WebApiKeySource = hasSessionWebApiKey
      ? 'session'
      : hasEnvironmentWebApiKey
        ? 'environment'
        : 'none';

    return {
      hasWebApiKey: webApiKeySource !== 'none',
      hasEnvironmentWebApiKey,
      hasSessionWebApiKey,
      hasPublisherKey: Boolean(this.environmentPublisherKey),
      hasFinancialKey: Boolean(this.environmentFinancialKey),
      hasOAuthClientId: Boolean(this.environmentOAuthClientId),
      hasOAuthAccessToken: Boolean(this.sessionOAuthAccessToken),
      hasSessionOAuthAccessToken: Boolean(this.sessionOAuthAccessToken),
      webApiKeySource,
    };
  }
}
