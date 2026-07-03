import { describe, expect, it } from 'vitest';

import {
  auditCatalogCoverage,
  extractDocumentedInterfaces,
  getCatalogInterfaceNames,
  normalizeInterfaceName,
} from '../scripts/audit-steam-catalog.js';

describe('Steam catalog audit script helpers', () => {
  it('normalizes app-specific Game Coordinator interface names', () => {
    expect(normalizeInterfaceName('IGCVersion_730')).toBe('IGCVersion_<appid>');
    expect(normalizeInterfaceName('ISteamUser')).toBe('ISteamUser');
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

  it('deduplicates and sorts catalog interface names', () => {
    expect(
      getCatalogInterfaceNames({
        apilist: {
          interfaces: [{ name: 'ISteamUser' }, { name: 'IGCVersion_730' }, { name: 'IGCVersion_440' }],
        },
      }),
    ).toEqual(['IGCVersion_<appid>', 'ISteamUser']);
  });

  it('reports catalog interfaces missing from the audit document', () => {
    expect(
      auditCatalogCoverage({
        auditDocText: '| `ISteamUser` | tools | none | source |\n',
        catalog: {
          apilist: {
            interfaces: [{ name: 'ISteamUser' }, { name: 'IWishlistService' }],
          },
        },
      }),
    ).toMatchObject({
      interfaceCount: 2,
      interfaces: ['ISteamUser', 'IWishlistService'],
      missing: ['IWishlistService'],
    });
  });
});
