import type { SteamWebApiCatalogClient } from '../catalog/steam-web-api-catalog.js';
import { classifyReadonlySafety } from '../catalog/safety.js';
import { SteamMcpError } from '../common/errors.js';
import type { HttpJsonClient } from '../common/http.js';

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
    parameterNames: string[];
  };
  response: unknown;
};

const secretParameterNames = new Set(['key', 'access_token', 'token']);

export class SteamWebApiReadonlyCaller {
  constructor(
    private readonly options: {
      catalogClient: SteamWebApiCatalogClient;
      http: Pick<HttpJsonClient, 'getJson'>;
      webApiKey?: string;
    },
  ) {}

  async call(request: ReadonlyApiCallRequest): Promise<ReadonlyApiCallResponse> {
    const method = await this.options.catalogClient.getMethodSchema({
      interfaceName: request.interfaceName,
      methodName: request.methodName,
      version: request.version,
    });
    const safety = classifyReadonlySafety(method);

    if (!safety.allowed) {
      throw new SteamMcpError({
        code: 'unsafe_method_blocked',
        message: `Steam Web API method ${method.interfaceName}.${method.name}/v${method.version} is blocked by the read-only safety policy.`,
        details: {
          reasons: safety.reasons,
        },
      });
    }

    const params = request.params ?? {};
    const secretParams = Object.keys(params).filter((name) => secretParameterNames.has(name.toLowerCase()));

    if (secretParams.length > 0) {
      throw new SteamMcpError({
        code: 'validation_error',
        message: 'Secret parameters must be supplied through environment configuration, not tool arguments.',
        details: {
          parameters: secretParams,
        },
      });
    }

    const missingRequiredParameters = method.parameters
      .filter((parameter) => !parameter.optional)
      .map((parameter) => parameter.name)
      .filter((name) => !secretParameterNames.has(name.toLowerCase()))
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

    if (requiresKey && !this.options.webApiKey) {
      throw new SteamMcpError({
        code: 'authentication_required',
        message: `Steam Web API method ${method.interfaceName}.${method.name}/v${method.version} requires STEAM_WEB_API_KEY.`,
      });
    }

    const url = new URL(`https://api.steampowered.com/${method.interfaceName}/${method.name}/v${method.version}/`);
    url.searchParams.set('format', 'json');

    for (const [name, value] of Object.entries(params)) {
      url.searchParams.set(name, String(value));
    }

    if (this.options.webApiKey && method.parameters.some((parameter) => parameter.name.toLowerCase() === 'key')) {
      url.searchParams.set('key', this.options.webApiKey);
    }

    const response = await this.options.http.getJson<unknown>(url);

    return {
      request: {
        interfaceName: method.interfaceName,
        methodName: method.name,
        version: method.version,
        httpMethod: method.httpMethod,
        parameterNames: [...Object.keys(params), ...(url.searchParams.has('key') ? ['key'] : [])],
      },
      response,
    };
  }
}
