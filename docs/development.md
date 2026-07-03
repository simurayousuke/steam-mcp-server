# Development Workflow

## Branch

- Primary branch: `main`
- Remote: `git@github.com:simurayousuke/steam-mcp-server.git`

## Commit Policy

- Keep commits small and reviewable.
- Run the relevant local check before each implementation commit when available.
- Push immediately after every commit.
- Do not commit secrets, `.env`, API keys, logs, build output, or dependency directories.

## Implementation Gate

The repository is an active runnable TypeScript MCP server. New feature work should keep the existing read-only-first policy, update docs when public behavior changes, add focused tests for new clients/tools/resources, and verify with:

```bash
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

When changing Steam Web API coverage, also run:

```bash
npm.cmd run audit:steam-catalog
```

This live audit checks the current public `ISteamWebAPIUtil/GetSupportedAPIList` catalog against `docs/official-webapi-audit.md`. CI runs the same audit after the test suite.

After each commit, push `main` immediately and confirm the GitHub Actions run for that commit.
