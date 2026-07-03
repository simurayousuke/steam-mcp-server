# Steam MCP Server

Steam MCP Server is a planned Model Context Protocol server for Steam public data, Steam Web API data, Steam Store metadata, and user-authorized read access where Steam officially supports it.

Current status: repository skeleton and design only. Steam API clients and MCP tools will be implemented after design approval.

The default policy is read-only. Official Steam Web API methods will be discoverable through a catalog, but protected or state-changing methods will not be callable unless they are explicitly allowlisted.

## Planned Runtime

- Node.js 20+
- TypeScript
- MCP over stdio first
- Optional HTTP transport after the stdio server is stable

## Initial Commands

```bash
npm install
npm run typecheck
npm run build
```

## Repository Layout

```text
src/
  auth/     Steam OpenID/OAuth callback flow and local sessions
  catalog/  Steam Web API catalog discovery and schema generation
  common/   shared errors, cache, logging, result helpers
  config/   environment parsing and runtime settings
  mcp/      MCP server bootstrap and transport wiring
  steam/    Steam Web API, Store, and Community clients
  tools/    MCP tool definitions and handlers
tests/      unit and integration tests
docs/       design and development notes
```

## References

- Official TypeScript SDK repository: https://github.com/modelcontextprotocol/typescript-sdk
- MCP documentation: https://modelcontextprotocol.io/
- Steam Web API documentation: https://steamcommunity.com/dev
- Steamworks Web API overview: https://partner.steamgames.com/doc/webapi_overview
