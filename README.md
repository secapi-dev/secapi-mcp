# secapi-mcp

Official [Model Context Protocol](https://modelcontextprotocol.io) server for [**secapi.dev**](https://secapi.dev).

Expose SEC filings, financial statements, insider trades, and institutional holdings as AI-native tools for Claude, Cursor, ChatGPT, Windsurf, VS Code, and any MCP-compatible client.

```
AI Client  →  MCP Tools  →  secapi.dev REST API  →  JSON Response  →  LLM
```

This server **never** talks to databases directly — it is a typed, validated interface over the [`secapi-node`](https://www.npmjs.com/package/secapi-node) SDK.

## Features

- **10 high-level AI tools** designed for reasoning, not REST endpoint mirroring
- **Every other endpoint, live** — two tools read the API's published OpenAPI document, so new endpoints are usable without a new release of this server
- **SDK-first architecture** — all API calls go through `secapi-node`
- **Zod validation** on every tool input
- **AI-friendly errors** with categories, suggestions, and retry hints
- **Structured JSON responses** with metadata and pagination
- **Extensible tool registry** — add new tools in minutes
- **Production logging** — structured, secrets-safe
- **Full test suite** with Vitest
- **CI/CD** with GitHub Actions and Changesets

## Installation

```bash
npm install -g secapi-mcp
# or
pnpm add -g secapi-mcp
# or run via npx
npx secapi-mcp
```

Requires Node.js 26+.

## Quick Start

1. Get an API key from [secapi.dev](https://secapi.dev)

2. Set your environment variable:

```bash
export SECAPI_API_KEY="your-api-key"
```

3. Run the server (stdio transport):

```bash
secapi-mcp
```

## MCP Client Configuration

### Cursor

Add to `.cursor/mcp.json` (or Cursor Settings → MCP):

```json
{
  "mcpServers": {
    "secapi": {
      "command": "npx",
      "args": ["-y", "secapi-mcp"],
      "env": {
        "SECAPI_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "secapi": {
      "command": "npx",
      "args": ["-y", "secapi-mcp"],
      "env": {
        "SECAPI_API_KEY": "your-api-key"
      }
    }
  }
}
```

### VS Code (GitHub Copilot)

Add to your VS Code MCP settings:

```json
{
  "mcp": {
    "servers": {
      "secapi": {
        "command": "npx",
        "args": ["-y", "secapi-mcp"],
        "env": {
          "SECAPI_API_KEY": "your-api-key"
        }
      }
    }
  }
}
```

### Windsurf

Add to Windsurf MCP configuration:

```json
{
  "mcpServers": {
    "secapi": {
      "command": "npx",
      "args": ["-y", "secapi-mcp"],
      "env": {
        "SECAPI_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Available Tools

| Tool                   | Description                                                              |
| ---------------------- | ------------------------------------------------------------------------ |
| `search_filings`       | Search SEC filings by ticker/CIK, form type, and date range              |
| `analyze_filing`       | Get filing metadata and document list for deeper analysis                |
| `search_companies`     | Search companies by name, ticker, or CIK                                 |
| `company_overview`     | Company profile plus recent filings — ideal research starting point      |
| `latest_financials`    | Latest 10-K/10-Q: income statement, balance sheet and cash flow          |
| `company_financials`   | One statement over several periods, standardized or as reported          |
| `company_ratios`       | Financial ratio time series (ROE, margins, liquidity, etc.)              |
| `insider_trades`       | Insider transactions, per company or market-wide; open-market buys/sells |
| `search_institutions`  | Find institutional investors (13F filers)                                |
| `institution_holdings` | 13F portfolio holdings for a given quarter                               |
| `list_api_endpoints`   | List the API's endpoints and their parameters, from the live docs        |
| `call_api_endpoint`    | Call any GET endpoint under `/v1/` by path                               |

## Environment Variables

| Variable             | Required | Default                           | Description                               |
| -------------------- | -------- | --------------------------------- | ----------------------------------------- |
| `SECAPI_API_KEY`     | Yes*     | —                                 | API key from secapi.dev                   |
| `SEC_API_KEY`        | Yes*     | —                                 | Legacy alias for `SECAPI_API_KEY`         |
| `SECAPI_BASE_URL`    | No       | `https://api.secapi.dev`          | API base URL                              |
| `SECAPI_OPENAPI_URL` | No       | `<base URL>/api/core/v3/api-docs` | OpenAPI document for `list_api_endpoints` |
| `SECAPI_TIMEOUT_MS`  | No       | `30000`                           | Request timeout in milliseconds           |
| `SECAPI_MAX_RETRIES` | No       | `2`                               | Retry count for transient failures        |
| `SECAPI_DEBUG`       | No       | `false`                           | Enable debug logging to stderr            |
| `SECAPI_USER_AGENT`  | No       | `secapi-mcp/0.1.0`                | User-Agent header                         |

\* One of `SECAPI_API_KEY` or `SEC_API_KEY` is required.

## Architecture

```
src/
├── index.ts              # stdio entry point
├── server/               # MCP server factory
├── client/               # secapi-node wrapper
├── config/               # Zod-validated configuration
├── errors/               # AI-friendly error categorization
├── logging/              # Structured, secrets-safe logging
├── schemas/              # Shared Zod schemas
├── utils/                # Response formatting
└── tools/
    ├── registry.ts       # Tool registration system
    ├── types.ts          # Tool definition interfaces
    ├── filings/          # Filing tools
    ├── companies/        # Company tools
    ├── financials/       # Financial statement tools
    ├── insiders/         # Insider trading tools
    └── institutions/     # 13F institutional tools
```

### Adding a New Tool

1. Create a tool definition in the appropriate `src/tools/<domain>/index.ts`:

```typescript
{
  name: "my_new_tool",
  description: "Clear description for the LLM...",
  inputSchema: z.object({ ticker: tickerSchema }),
  handler: async (input, { client }) => {
    const data = await client.filings.search({ ticker: input.ticker });
    return createToolResponse("my_new_tool", data.data, {
      pagination: data.pagination,
    });
  },
}
```

2. Export the module from `src/tools/index.ts` if it's a new domain.

That's it — the registry handles validation, error formatting, and MCP registration.

## Development

```bash
git clone https://github.com/secapi-dev/secapi-mcp.git
cd secapi-mcp
pnpm install
pnpm test
pnpm build
```

Run locally:

```bash
SECAPI_API_KEY=your-key pnpm start
```

## Scripts

| Script           | Description              |
| ---------------- | ------------------------ |
| `pnpm build`     | Build to `dist/`         |
| `pnpm test`      | Run Vitest test suite    |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint`      | ESLint                   |
| `pnpm format`    | Prettier format          |

## Troubleshooting

**"API key is required"** — Set `SECAPI_API_KEY` in your MCP client config `env` block.

**"Invalid or missing API key"** — Verify your key at [secapi.dev](https://secapi.dev). Keys are never logged.

**"API rate limit exceeded"** — Wait and retry, or upgrade your plan.

**Server not appearing in Cursor** — Restart Cursor after editing MCP config. Check stderr logs with `SECAPI_DEBUG=true`.

## FAQ

**Why not mirror REST endpoints 1:1?**
AI agents work better with semantic, high-level tools. `company_overview` is more useful than `GET /entities/:id` + `GET /entities/:id/filings`.

**Can I self-host?**
Yes. Set `SECAPI_BASE_URL` if using a custom API deployment.

**The API got a new endpoint. Do I need a new release of this server?**
No. `list_api_endpoints` reads the API's OpenAPI document at run time (cached for 10 minutes) and `call_api_endpoint` can call any GET path under `/v1/`, so a new endpoint is usable as soon as it is deployed. Add a dedicated tool only when an endpoint deserves a better description, defaults, or a combined response.

**How do I add more tools?**
See [Adding a New Tool](#adding-a-new-tool). The framework is designed for fast extension.

## License

MIT — see [LICENSE](LICENSE).

## Links

- [secapi.dev](https://secapi.dev) — API platform
- [secapi-node](https://www.npmjs.com/package/secapi-node) — TypeScript SDK
- [Model Context Protocol](https://modelcontextprotocol.io) — MCP specification
