import type { SteamWebApiCatalogClient } from '../catalog/steam-web-api-catalog.js';
import { isReservedApiParameterName, isSecretApiParameterName } from '../catalog/api-parameters.js';
import { classifyReadonlySafety } from '../catalog/safety.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';
import { methodIdentifier } from '../config/allowlist.js';

export type ReadonlyApiParameterValue = string | number | boolean;

export type ReadonlyApiCallRequest = {
  interfaceName: string;
  methodName: string;
  version?: number;
  params?: Record<string, ReadonlyApiParameterValue>;
};

export type ReadonlyApiCallResponse = {
  request: {
    interfaceName: string;
    methodName: string;
    version: number;
    httpMethod: string;
    allowlisted: boolean;
    parameterNames: string[];
  };
  response: unknown;
};

export class SteamWebApiReadonlyCaller {
  constructor(
    private readonly options: {
      catalogClient: SteamWebApiCatalogClient;
      http: Pick<HttpJsonClient, 'getJson' | 'postFormJson'>;
      webApiKey?: string | (() => string | undefined);
      oauthAccessToken?: string | (() => string | undefined);
      allowlistedMethods?: ReadonlySet<string>;
    },
  ) {}

  async call(request: ReadonlyApiCallRequest): Promise<ReadonlyApiCallResponse> {
    const method = await this.options.catalogClient.getMethodSchema({
      interfaceName: request.interfaceName,
      methodName: request.methodName,
      version: request.version,
    });
    const safety = classifyReadonlySafety(method);

    const identifier = methodIdentifier({
      interfaceName: method.interfaceName,
      methodName: method.name,
      version: method.version,
    });
    const isAllowlisted = this.options.allowlistedMethods?.has(identifier) ?? false;

    if (!safety.allowed && !isAllowlisted) {
      throw new SteamMcpError({
        code: 'unsafe_method_blocked',
        message: `Steam Web API method ${method.interfaceName}.${method.name}/v${method.version} is blocked by the read-only safety policy.`,
        details: {
          reasons: safety.reasons,
        },
      });
    }

    if (method.httpMethod !== 'GET' && method.httpMethod !== 'POST') {
      throw new SteamMcpError({
        code: 'unsafe_method_blocked',
        message: `Steam Web API method ${method.interfaceName}.${method.name}/v${method.version} uses unsupported HTTP method ${method.httpMethod}.`,
      });
    }

    const params = request.params ?? {};
    const secretParams = Object.keys(params).filter((name) => isSecretApiParameterName(name));

    if (secretParams.length > 0) {
      throw new SteamMcpError({
        code: 'validation_error',
        message: 'Secret parameters must be supplied through environment configuration, not tool arguments.',
        details: {
          parameters: secretParams,
        },
      });
    }

    const reservedParams = Object.keys(params).filter((name) => isReservedApiParameterName(name));

    if (reservedParams.length > 0) {
      throw new SteamMcpError({
        code: 'validation_error',
        message: 'Reserved Steam Web API parameters are managed by the server, not tool arguments.',
        details: {
          parameters: reservedParams,
        },
      });
    }

    const missingRequiredParameters = method.parameters
      .filter((parameter) => !parameter.optional)
      .map((parameter) => parameter.name)
      .filter((name) => !isSecretApiParameterName(name))
      .filter((name) => !isReservedApiParameterName(name))
      .filter((name) => params[name] === undefined);

    if (missingRequiredParameters.length > 0) {
      throw new SteamMcpError({
        code: 'validation_error',
        message: 'Missing required Steam Web API parameters.',
        details: {
          parameters: missingRequiredParameters,
        },
      });
    }

    const requiresKey = method.parameters.some((parameter) => parameter.name.toLowerCase() === 'key' && !parameter.optional);
    const webApiKey = resolveWebApiKey(this.options.webApiKey);
    const requiresOAuthAccessToken = method.parameters.some(
      (parameter) => parameter.name.toLowerCase() === 'access_token' && !parameter.optional,
    );
    const oauthAccessToken = resolveOAuthAccessToken(this.options.oauthAccessToken);
    const unsupportedRequiredSecretParameters = method.parameters
      .filter((parameter) => !parameter.optional)
      .map((parameter) => parameter.name)
      .filter((name) => isSecretApiParameterName(name))
      .filter((name) => {
        const normalized = name.toLowerCase();
        return normalized !== 'key' && normalized !== 'access_token';
      });

    if (requiresKey && !webApiKey) {
      throw new SteamMcpError({
        code: 'authentication_required',
        message: `Steam Web API method ${method.interfaceName}.${method.name}/v${method.version} requires STEAM_WEB_API_KEY.`,
      });
    }

    if (requiresOAuthAccessToken && !oauthAccessToken) {
      throw new SteamMcpError({
        code: 'authentication_required',
        message: `Steam Web API method ${method.interfaceName}.${method.name}/v${method.version} requires a session Steam OAuth access token.`,
      });
    }

    if (unsupportedRequiredSecretParameters.length > 0) {
      throw new SteamMcpError({
        code: 'authentication_required',
        message: `Steam Web API method ${method.interfaceName}.${method.name}/v${method.version} requires unsupported secret parameters.`,
        details: {
          parameters: unsupportedRequiredSecretParameters,
        },
      });
    }

    const url = new URL(`https://api.steampowered.com/${method.interfaceName}/${method.name}/v${method.version}/`);
    const requestParams = new URLSearchParams();
    requestParams.set('format', 'json');

    for (const [name, value] of Object.entries(params)) {
      requestParams.set(name, String(value));
    }

    if (webApiKey && method.parameters.some((parameter) => parameter.name.toLowerCase() === 'key')) {
      requestParams.set('key', webApiKey);
    }

    if (oauthAccessToken && method.parameters.some((parameter) => parameter.name.toLowerCase() === 'access_token')) {
      requestParams.set('access_token', oauthAccessToken);
    }

    const response =
      method.httpMethod === 'POST'
        ? await this.options.http.postFormJson<unknown>(url, requestParams)
        : await this.options.http.getJson<unknown>(withSearchParams(url, requestParams));

    return {
      request: {
        interfaceName: method.interfaceName,
        methodName: method.name,
        version: method.version,
        httpMethod: method.httpMethod,
        allowlisted: isAllowlisted,
        parameterNames: [
          ...Object.keys(params),
          ...(requestParams.has('key') ? ['key'] : []),
          ...(requestParams.has('access_token') ? ['access_token'] : []),
        ],
      },
      response,
    };
  }
}

function withSearchParams(url: URL, params: URLSearchParams): URL {
  const nextUrl = new URL(url);

  for (const [name, value] of params) {
    nextUrl.searchParams.set(name, value);
  }

  return nextUrl;
}

function resolveWebApiKey(webApiKey: string | (() => string | undefined) | undefined): string | undefined {
  return typeof webApiKey === 'function' ? webApiKey() : webApiKey;
}

function resolveOAuthAccessToken(oauthAccessToken: string | (() => string | undefined) | undefined): string | undefined {
  return typeof oauthAccessToken === 'function' ? oauthAccessToken() : oauthAccessToken;
}
