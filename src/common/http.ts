import { SteamMcpError } from './errors.js';

export type HttpJsonClientOptions = {
  timeoutMs: number;
  userAgent: string;
};

export type JsonRequestOptions = {
  headers?: HeadersInit;
  signal?: AbortSignal;
};

export class HttpJsonClient {
  constructor(private readonly options: HttpJsonClientOptions) {}

  async getJson<T>(url: URL, options: JsonRequestOptions = {}): Promise<T> {
    const response = await this.request(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
      signal: options.signal,
    });

    return (await response.json()) as T;
  }

  async postFormText(url: URL, form: URLSearchParams, options: JsonRequestOptions = {}): Promise<string> {
    const response = await this.request(url, {
      method: 'POST',
      headers: {
        Accept: 'text/plain',
        'Content-Type': 'application/x-www-form-urlencoded',
        ...options.headers,
      },
      body: form.toString(),
      signal: options.signal,
    });

    return response.text();
  }

  private async request(
    url: URL,
    options: {
      method: 'GET' | 'POST';
      headers?: HeadersInit;
      body?: BodyInit;
      signal?: AbortSignal;
    },
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    const signal = mergeAbortSignals(controller.signal, options.signal);

    try {
      const response = await fetch(url, {
        method: options.method,
        headers: {
          'User-Agent': this.options.userAgent,
          ...options.headers,
        },
        body: options.body,
        signal,
      });

      if (!response.ok) {
        throw new SteamMcpError({
          code: mapHttpStatusToErrorCode(response.status),
          message: `Steam endpoint returned HTTP ${response.status}.`,
          status: response.status,
          details: {
            url: redactUrl(url),
          },
        });
      }

      return response;
    } catch (error: unknown) {
      if (error instanceof SteamMcpError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new SteamMcpError({
          code: 'upstream_error',
          message: `Steam endpoint timed out after ${this.options.timeoutMs} ms.`,
          cause: error,
          details: {
            url: redactUrl(url),
          },
        });
      }

      throw new SteamMcpError({
        code: 'upstream_error',
        message: error instanceof Error ? error.message : String(error),
        cause: error,
        details: {
          url: redactUrl(url),
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

function mapHttpStatusToErrorCode(status: number): SteamMcpError['code'] {
  if (status === 401) {
    return 'authentication_required';
  }

  if (status === 403) {
    return 'private_or_forbidden';
  }

  if (status === 404) {
    return 'not_found';
  }

  if (status === 429) {
    return 'rate_limited';
  }

  return 'upstream_error';
}

function mergeAbortSignals(primary: AbortSignal, secondary: AbortSignal | undefined): AbortSignal {
  if (!secondary) {
    return primary;
  }

  if (secondary.aborted) {
    return secondary;
  }

  const controller = new AbortController();
  const abort = () => controller.abort();

  primary.addEventListener('abort', abort, { once: true });
  secondary.addEventListener('abort', abort, { once: true });

  return controller.signal;
}

export function redactUrl(url: URL): string {
  const redacted = new URL(url);

  for (const key of redacted.searchParams.keys()) {
    if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token')) {
      redacted.searchParams.set(key, '[redacted]');
    }
  }

  return redacted.toString();
}
