export type WebApiKeySource = 'environment' | 'session' | 'none';

export type CredentialStatus = {
  hasWebApiKey: boolean;
  hasEnvironmentWebApiKey: boolean;
  hasSessionWebApiKey: boolean;
  webApiKeySource: WebApiKeySource;
};

export class SteamCredentialManager {
  private sessionWebApiKey: string | undefined;

  constructor(private readonly environmentWebApiKey: string | undefined) {}

  getWebApiKey(): string | undefined {
    return this.sessionWebApiKey ?? this.environmentWebApiKey;
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
      webApiKeySource,
    };
  }
}
