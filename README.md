# Steam MCP Server

Steam MCP Server is a planned read-only Model Context Protocol server for Steam public data, Steam Web API data, and Steam Store metadata.

Current status: repository skeleton and design only. Steam API clients and MCP tools will be implemented after design approval.

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
