const secretApiParameterNames = new Set(['key', 'access_token', 'token']);
const reservedApiParameterNames = new Set(['format']);

export function isSecretApiParameterName(name: string): boolean {
  return secretApiParameterNames.has(normalizeParameterName(name));
}

export function isReservedApiParameterName(name: string): boolean {
  return reservedApiParameterNames.has(normalizeParameterName(name));
}

export function getReservedApiParameterNames(): string[] {
  return [...reservedApiParameterNames].sort();
}

function normalizeParameterName(name: string): string {
  return name.toLowerCase();
}
