import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadApiAllowlist, methodIdentifier } from '../src/config/allowlist.js';

describe('Steam API allowlist', () => {
  it('loads method identifiers from a text file', () => {
    const directory = mkdtempSync(join(tmpdir(), 'steam-mcp-allowlist-'));
    const filePath = join(directory, 'allowlist.txt');
    writeFileSync(
      filePath,
      `
# read-only POST endpoint
ISteamRemoteStorage.GetPublishedFileDetails.v1
`,
      'utf8',
    );

    expect(loadApiAllowlist(filePath)).toEqual(new Set(['isteamremotestorage.getpublishedfiledetails.v1']));
  });

  it('normalizes method identifiers', () => {
    expect(
      methodIdentifier({
        interfaceName: 'ISteamRemoteStorage',
        methodName: 'GetPublishedFileDetails',
        version: 1,
      }),
    ).toBe('isteamremotestorage.getpublishedfiledetails.v1');
  });

  it('rejects invalid method identifiers', () => {
    const directory = mkdtempSync(join(tmpdir(), 'steam-mcp-allowlist-'));
    const filePath = join(directory, 'allowlist.txt');
    writeFileSync(filePath, 'not-a-method\n', 'utf8');

    expect(() => loadApiAllowlist(filePath)).toThrow('Invalid Steam API allowlist method identifier');
  });
});
