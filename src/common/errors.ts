export const steamErrorCodes = [
  'validation_error',
  'not_found',
  'private_or_forbidden',
  'authentication_required',
  'authorization_required',
  'rate_limited',
  'upstream_error',
  'configuration_error',
  'unsafe_method_blocked',
] as const;

export type SteamErrorCode = (typeof steamErrorCodes)[number];

export type SteamErrorOptions = {
  code: SteamErrorCode;
  message: string;
  status?: number;
  cause?: unknown;
  details?: Record<string, unknown>;
};

export class SteamMcpError extends Error {
  readonly code: SteamErrorCode;
  readonly status?: number;
  readonly details?: Record<string, unknown>;

  constructor(options: SteamErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'SteamMcpError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

export function toSteamMcpError(error: unknown): SteamMcpError {
  if (error instanceof SteamMcpError) {
    return error;
  }

  if (error instanceof Error) {
    return new SteamMcpError({
      code: 'upstream_error',
      message: error.message,
      cause: error,
    });
  }

  return new SteamMcpError({
    code: 'upstream_error',
    message: String(error),
  });
}
