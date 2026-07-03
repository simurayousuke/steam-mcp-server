import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import { createSteamMcpServer } from './server.js';

const DEFAULT_ENDPOINT = '/mcp';
const DEFAULT_MAX_BODY_BYTES = 4 * 1024 * 1024;

type HttpMcpSession = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
};

export type SteamMcpHttpServerOptions = {
  endpoint?: string;
  maxBodyBytes?: number;
};

export type SteamMcpHttpServer = {
  endpoint: string;
  server: Server;
  close: () => Promise<void>;
  getSessionCount: () => number;
};

class HttpRequestError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function createSteamMcpHttpServer(options: SteamMcpHttpServerOptions = {}): SteamMcpHttpServer {
  const endpoint = normalizeEndpoint(options.endpoint ?? DEFAULT_ENDPOINT);
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const sessions = new Map<string, HttpMcpSession>();

  const nodeServer = createServer((req, res) => {
    void handleRequest(req, res).catch((error: unknown) => {
      handleUnexpectedError(res, error);
    });
  });

  async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const requestUrl = getRequestUrl(req);

    if (requestUrl.pathname === '/healthz') {
      sendJson(res, 200, {
        status: 'ok',
        endpoint,
        activeSessions: sessions.size,
      });
      return;
    }

    if (requestUrl.pathname !== endpoint) {
      sendJson(res, 404, {
        error: 'not_found',
        message: `Use ${endpoint} for MCP Streamable HTTP requests.`,
      });
      return;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        Allow: 'GET, POST, DELETE, OPTIONS',
      });
      res.end();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'DELETE') {
      sendJsonRpcError(res, 405, -32000, `Method ${req.method ?? 'UNKNOWN'} is not allowed.`);
      return;
    }

    const parsedBody = req.method === 'POST' ? await readJsonBody(req, maxBodyBytes) : undefined;
    const transport = await resolveTransport(req, res, parsedBody);

    if (!transport) {
      return;
    }

    await transport.handleRequest(req, res, parsedBody);
  }

  async function resolveTransport(
    req: IncomingMessage,
    res: ServerResponse,
    parsedBody: unknown,
  ): Promise<StreamableHTTPServerTransport | undefined> {
    const sessionId = getHeaderValue(req, 'mcp-session-id');

    if (sessionId) {
      const session = sessions.get(sessionId);

      if (!session) {
        sendJsonRpcError(res, 404, -32001, 'MCP session was not found.');
        return undefined;
      }

      return session.transport;
    }

    if (req.method !== 'POST' || !isInitializeRequest(parsedBody)) {
      sendJsonRpcError(res, 400, -32000, 'A valid MCP initialize request is required to create a session.');
      return undefined;
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: (newSessionId) => {
        sessions.set(newSessionId, session);
      },
    });
    const server = createSteamMcpServer();
    const session: HttpMcpSession = {
      server,
      transport,
    };

    transport.onclose = () => {
      const closedSessionId = transport.sessionId;

      if (closedSessionId) {
        sessions.delete(closedSessionId);
      }
    };

    await server.connect(transport);
    return transport;
  }

  async function close(): Promise<void> {
    const closeSessions = Array.from(sessions.values()).map(async (session) => {
      await session.server.close();
    });

    sessions.clear();
    await Promise.all(closeSessions);

    if (nodeServer.listening) {
      await new Promise<void>((resolve, reject) => {
        nodeServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  }

  return {
    endpoint,
    server: nodeServer,
    close,
    getSessionCount: () => sessions.size,
  };
}

function normalizeEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim();

  if (trimmed.length === 0 || trimmed === '/') {
    return DEFAULT_ENDPOINT;
  }

  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function getRequestUrl(req: IncomingMessage): URL {
  const host = getHeaderValue(req, 'host') ?? '127.0.0.1';
  return new URL(req.url ?? '/', `http://${host}`);
}

function getHeaderValue(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

async function readJsonBody(req: IncomingMessage, maxBodyBytes: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let byteLength = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.byteLength;

    if (byteLength > maxBodyBytes) {
      throw new HttpRequestError(413, 'Request body is too large.');
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const text = Buffer.concat(chunks).toString('utf8').trim();

  if (text.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpRequestError(400, 'Request body must be valid JSON.');
  }
}

function handleUnexpectedError(res: ServerResponse, error: unknown): void {
  if (res.headersSent) {
    res.end();
    return;
  }

  if (error instanceof HttpRequestError) {
    sendJsonRpcError(res, error.statusCode, -32700, error.message);
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  sendJsonRpcError(res, 500, -32603, message);
}

function sendJsonRpcError(res: ServerResponse, statusCode: number, code: number, message: string): void {
  sendJson(res, statusCode, {
    jsonrpc: '2.0',
    error: {
      code,
      message,
    },
    id: null,
  });
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(body));
}
