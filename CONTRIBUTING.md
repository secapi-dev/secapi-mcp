# Contributing to secapi-mcp

Thank you for helping build the official MCP server for secapi.dev.

## Development Setup

```bash
pnpm install
pnpm test
pnpm build
```

## Adding a Tool

Tools live in `src/tools/<domain>/index.ts`. Each tool is a `ToolDefinition` with:

- `name` — snake_case, semantic (e.g. `search_filings`, not `get_filings_v2`)
- `description` — written for LLMs, not developers
- `inputSchema` — Zod object with defaults and descriptive error messages
- `handler` — calls `secapi-node` client methods, returns `createToolResponse()`
- `examples` (optional) — usage hints appended to the description

Register new domain modules in `src/tools/index.ts`.

## Code Style

- TypeScript strict mode
- Run `pnpm lint` and `pnpm format` before submitting
- No direct `fetch()` calls in tools — use `secapi-node`
- Never log API keys or secrets

## Testing

- Add unit tests for new Zod schemas and tool validation
- Mock API calls for integration tests when needed
- Run `pnpm test` before opening a PR

## Versioning

We use [Changesets](https://github.com/changesets/changesets). Add a changeset when your PR includes user-facing changes:

```bash
pnpm changeset
```

## Pull Requests

1. Fork and create a feature branch
2. Add tests for your changes
3. Ensure CI passes (`pnpm typecheck && pnpm lint && pnpm test && pnpm build`)
4. Open a PR with a clear description
