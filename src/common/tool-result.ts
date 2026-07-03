import { toSteamMcpError } from './errors.js';

export type ToolSuccessOptions = {
  data: Record<string, unknown>;
  summary?: string;
};

export function toolSuccess(options: ToolSuccessOptions) {
  return {
    structuredContent: options.data,
    content: [
      {
        type: 'text' as const,
        text: options.summary ?? JSON.stringify(options.data, null, 2),
      },
    ],
  };
}

export function toolFailure(error: unknown) {
  const steamError = toSteamMcpError(error);
  const payload = {
    error: {
      code: steamError.code,
      message: steamError.message,
      status: steamError.status,
      details: steamError.details,
    },
  };

  return {
    isError: true,
    structuredContent: payload,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}
