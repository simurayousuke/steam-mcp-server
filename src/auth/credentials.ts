export type WebApiKeySource = 'environment' | 'session' | 'none';

export type CredentialStatus = {
  hasWebApiKey: boolean;
  hasEnvironmentWebApiKey: boolean;
  hasSessionWebApiKey: boolean;
  hasPublisherKey: boolean;
  webApiKeySource: WebApiKeySource;
};

export class SteamCredentialManager {
  private sessionWebApiKey: string | undefined;

  constructor(
    private readonly environmentWebApiKey: string | undefined,
    private readonly environmentPublisherKey: string | undefined = undefined,
  ) {}

  getWebApiKey(): string | undefined {
    return this.sessionWebApiKey ?? this.environmentWebApiKey;
  }

  getPublisherKey(): string | undefined {
    return this.environmentPublisherKey;
  }

  setSessionWebApiKey(webApiKey: string): CredentialStatus {
    this.sessionWebApiKey = webApiKey.trim();
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
      webApiKeySource,
    };
  }
}
