import type { SteamWebApiMethodSchema } from './steam-web-api-catalog.js';

export const dangerousMethodNamePatterns = [
  /^add/i,
  /^cancel/i,
  /^consume/i,
  /^create/i,
  /^delete/i,
  /^finalize/i,
  /^grant/i,
  /^init/i,
  /^modify/i,
  /^refund/i,
  /^remove/i,
  /^report/i,
  /^send/i,
  /^set/i,
  /^update/i,
  /add/i,
  /cancel/i,
  /consume/i,
  /delete/i,
  /finalize/i,
  /grant/i,
  /init/i,
  /modify/i,
  /refund/i,
  /remove/i,
  /report/i,
  /set/i,
  /update/i,
] as const;

export const sensitiveInterfaceNames = new Set(['iauthenticationservice']);

export const sideEffectMethodIdentifiers = new Set(['isteambroadcast.viewerheartbeat.v1']);

export type ApiSafetyDecision = {
  allowed: boolean;
  reasons: string[];
};

export function classifyReadonlySafety(method: SteamWebApiMethodSchema): ApiSafetyDecision {
  const reasons: string[] = [];
  const interfaceName = method.interfaceName.toLowerCase();
  const methodIdentifier = `${interfaceName}.${method.name.toLowerCase()}.v${method.version}`;

  if (sensitiveInterfaceNames.has(interfaceName)) {
    reasons.push(`Interface ${method.interfaceName} is blocked by the default policy because it handles Steam authentication flows.`);
  }

  if (sideEffectMethodIdentifiers.has(methodIdentifier)) {
    reasons.push(`Method ${method.interfaceName}.${method.name}/v${method.version} is blocked because it has side effects despite using GET.`);
  }

  if (method.httpMethod !== 'GET') {
    reasons.push(`HTTP method ${method.httpMethod} is not allowed by the default read-only policy.`);
  }

  for (const pattern of dangerousMethodNamePatterns) {
    if (pattern.test(method.name)) {
      reasons.push(`Method name ${method.name} matches the dangerous operation pattern ${pattern.toString()}.`);
      break;
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}
