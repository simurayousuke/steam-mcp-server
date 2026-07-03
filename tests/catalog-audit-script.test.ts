import { describe, expect, it } from 'vitest';

import {
  auditCatalogCoverage,
  extractDocumentedMethodIdentifiers,
  extractDocumentedInterfaces,
  getCatalogInterfaceNames,
  getCatalogMethodIdentifiers,
  normalizeInterfaceName,
  normalizeMethodIdentifier,
} from '../scripts/audit-steam-catalog.js';

describe('Steam catalog audit script helpers', () => {
  it('normalizes app-specific Game Coordinator interface names', () => {
    expect(normalizeInterfaceName('IGCVersion_730')).toBe('IGCVersion_<appid>');
    expect(normalizeInterfaceName('ISteamUser')).toBe('ISteamUser');
    expect(normalizeMethodIdentifier('IGCVersion_730', 'GetServerVersion', 1)).toBe(
      'IGCVersion_<appid>.GetServerVersion.v1',
    );
  });

  it('extracts documented interface names from the audit table', () => {
    expect(
      extractDocumentedInterfaces(`
| Interface | High-level coverage | Deliberately excluded high-level methods | Source |
| --- | --- | --- | --- |
| \`ISteamUser\` | tools | none | source |
| \`IGCVersion_<appid>\` | tools | none | source |
`),
    ).toEqual(new Set(['ISteamUser', 'IGCVersion_<appid>']));
  });

  it('extracts documented method identifiers from the audit document', () => {
    expect(
      extractDocumentedMethodIdentifiers(`
- \`ISteamUser.GetPlayerSummaries.v2\`
- \`IGCVersion_<appid>.GetServerVersion.v1\`
`),
    ).toEqual(new Set(['ISteamUser.GetPlayerSummaries.v2', 'IGCVersion_<appid>.GetServerVersion.v1']));
  });

  it('deduplicates and sorts catalog interface names', () => {
    expect(
      getCatalogInterfaceNames({
        apilist: {
          interfaces: [{ name: 'ISteamUser' }, { name: 'IGCVersion_730' }, { name: 'IGCVersion_440' }],
        },
      }),
    ).toEqual(['IGCVersion_<appid>', 'ISteamUser']);
  });

  it('deduplicates and sorts catalog method identifiers', () => {
    expect(
      getCatalogMethodIdentifiers({
        apilist: {
          interfaces: [
            {
              name: 'IGCVersion_730',
              methods: [{ name: 'GetServerVersion', version: 1 }],
            },
            {
              name: 'IGCVersion_440',
              methods: [{ name: 'GetServerVersion', version: 1 }],
            },
            {
              name: 'ISteamUser',
              methods: [{ name: 'GetPlayerSummaries', version: 2 }],
            },
          ],
        },
      }),
    ).toEqual(['IGCVersion_<appid>.GetServerVersion.v1', 'ISteamUser.GetPlayerSummaries.v2']);
  });

  it('reports catalog interfaces and methods missing from the audit document', () => {
    expect(
      auditCatalogCoverage({
        auditDocText: '| `ISteamUser` | tools | none | source |\n- `ISteamUser.GetPlayerSummaries.v2`\n',
        catalog: {
          apilist: {
            interfaces: [
              {
                name: 'ISteamUser',
                methods: [{ name: 'GetPlayerSummaries', version: 2 }],
              },
              {
                name: 'IWishlistService',
                methods: [{ name: 'GetWishlist', version: 1 }],
              },
            ],
          },
        },
      }),
    ).toMatchObject({
      interfaceCount: 2,
      interfaces: ['ISteamUser', 'IWishlistService'],
      methodCount: 2,
      missing: ['IWishlistService'],
      missingInterfaces: ['IWishlistService'],
      missingMethods: ['IWishlistService.GetWishlist.v1'],
    });
  });
});
