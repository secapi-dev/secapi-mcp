import { describe, expect, it } from "vitest";
import { parseOpenApi, type ApiEndpoint } from "../../src/client/openapi.js";
import { toolModules } from "../../src/tools/index.js";
import type { ToolContext } from "../../src/tools/index.js";

type Call = { path: string; query: Record<string, unknown> | undefined };

function setup(endpoints: ApiEndpoint[] = []) {
  const calls: Call[] = [];
  const client = {
    get: async (path: string, query?: Record<string, unknown>) => {
      calls.push({ path, query });
      return { transactions: [{ id: 1 }], pagination: { page: 1, limit: 20, hasMoreData: true } };
    },
    institutions: { profile: async () => ({}) },
  };
  const ctx = {
    client,
    logger: { debug() {}, info() {}, warn() {}, error() {} },
    api: { endpoints: async () => endpoints },
  } as unknown as ToolContext;

  async function run(name: string, input: Record<string, unknown>) {
    const tool = toolModules.flatMap((m) => m.tools).find((t) => t.name === name);
    if (!tool) throw new Error(`No tool named ${name}`);
    return tool.handler(tool.inputSchema.parse(input), ctx) as Promise<{
      meta: { summary?: string; pagination?: unknown };
      data: unknown;
    }>;
  }

  /** Query parameters actually sent (undefined values are dropped by the client). */
  function sent(call: Call | undefined): Record<string, unknown> {
    return Object.fromEntries(Object.entries(call?.query ?? {}).filter(([, v]) => v !== undefined));
  }

  return { calls, run, sent };
}

describe("insider_trades", () => {
  it("sends the date range as acceptedFrom / acceptedTo", async () => {
    const { calls, run, sent } = setup();

    await run("insider_trades", { ticker: "nvda", startDate: "2026-01-01", endDate: "2026-03-31" });

    expect(calls[0]?.path).toBe("/v1/insiders/NVDA/transactions");
    expect(sent(calls[0])).toEqual({
      limit: 20,
      page: 1,
      acceptedFrom: "2026-01-01",
      acceptedTo: "2026-03-31",
    });
  });

  it("buying and selling mean open-market purchases and sales", async () => {
    const { calls, run, sent } = setup();

    await run("insider_trades", { ticker: "TSLA", activity: "buying" });
    await run("insider_trades", { ticker: "TSLA", activity: "selling", page: 2 });

    expect(sent(calls[0])).toMatchObject({ transactionCode: "P", derivative: false });
    expect(sent(calls[0])).not.toHaveProperty("acquiredDisposed");
    expect(sent(calls[1])).toMatchObject({ transactionCode: "S", derivative: false, page: 2 });
  });

  it("without a ticker reads the market-wide feed and reports pagination", async () => {
    const { calls, run } = setup();

    const result = await run("insider_trades", { activity: "buying", minValue: 1000000 });

    expect(calls[0]?.path).toBe("/v1/insiders/transactions");
    expect(calls[0]?.query).toMatchObject({ minValue: 1000000 });
    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.meta.pagination).toEqual({ page: 1, limit: 20, hasMore: true });
  });

  it("latest ignores the date and value filters", async () => {
    const { calls, run, sent } = setup();

    await run("insider_trades", {
      ticker: "AAPL",
      activity: "latest",
      startDate: "2026-01-01",
      minValue: 5,
    });

    expect(sent(calls[0])).toEqual({ limit: 20, page: 1 });
  });
});

describe("financial tools", () => {
  it("company_financials defaults to the standardized annual history by company", async () => {
    const { calls, run } = setup();

    await run("company_financials", { identifier: "MSFT" });

    expect(calls[0]).toEqual({
      path: "/v1/financials/MSFT/statements/income-statement/standardized",
      query: { period: "annual", limit: 4 },
    });
  });

  it("company_financials as_reported uses the latest filing, and ytd falls back to quarterly", async () => {
    const { calls, run, sent } = setup();

    await run("company_financials", {
      identifier: "AAPL",
      statement: "balance",
      view: "as_reported",
    });
    await run("company_financials", {
      identifier: "AAPL",
      statement: "cash_flow",
      view: "as_reported",
      period: "ytd",
    });

    expect(calls[0]?.path).toBe("/v1/financials/AAPL/statements/balance-sheet");
    expect(sent(calls[0])).toEqual({});
    expect(calls[1]?.path).toBe("/v1/financials/AAPL/statements/cash-flow");
    expect(sent(calls[1])).toEqual({ period: "quarterly" });
  });

  it("company_financials with an accession number reads that filing", async () => {
    const { calls, run } = setup();

    await run("company_financials", {
      identifier: "AAPL",
      statement: "cash_flow",
      accessionNumber: "0000320193-26-000026",
    });
    await run("company_financials", {
      identifier: "AAPL",
      view: "as_reported",
      accessionNumber: "0000320193-26-000026",
    });

    expect(calls[0]?.path).toBe(
      "/v1/financials/filings/0000320193-26-000026/statements/cash-flow/standardized",
    );
    expect(calls[1]?.path).toBe(
      "/v1/financials/filings/0000320193-26-000026/statements/income-statement",
    );
  });

  it("latest_financials calls the by-company endpoint", async () => {
    const { calls, run, sent } = setup();

    await run("latest_financials", { identifier: "BRK.B", period: "annual" });

    expect(calls[0]?.path).toBe("/v1/financials/BRK.B/latest");
    expect(sent(calls[0])).toEqual({ period: "annual" });
  });
});

describe("institution_holdings", () => {
  it("passes the page through", async () => {
    const { calls, run, sent } = setup();

    await run("institution_holdings", { cik: "0001067983", limit: 50, page: 2 });

    expect(calls[0]?.path).toBe("/v1/institutions/0001067983/holdings");
    expect(sent(calls[0])).toEqual({ limit: 50, page: 2, sort: "value" });
  });
});

describe("live-documentation tools", () => {
  const endpoints = parseOpenApi({
    paths: {
      "/v1/financials/{issuer}/segments/geography": {
        get: {
          summary: "Geographic segments",
          parameters: [
            { name: "issuer", in: "path", required: true, description: "Ticker or CIK" },
            {
              name: "period",
              in: "query",
              schema: { type: "string", enum: ["annual", "quarterly"], default: "annual" },
            },
          ],
        },
      },
      "/v1/insiders/{ticker}/owners": { get: { summary: "Insider owners" } },
      "/v1/internal/reindex": { post: { summary: "Not a GET" } },
    },
  });

  it("parses GET operations with their parameters", () => {
    expect(endpoints.map((e) => e.path)).toEqual([
      "/v1/financials/{issuer}/segments/geography",
      "/v1/insiders/{ticker}/owners",
    ]);
    expect(endpoints[0]?.category).toBe("financials");
    expect(endpoints[0]?.parameters).toEqual([
      { name: "issuer", in: "path", required: true, description: "Ticker or CIK" },
      {
        name: "period",
        in: "query",
        required: false,
        allowedValues: ["annual", "quarterly"],
        default: "annual",
      },
    ]);
  });

  it("list_api_endpoints filters by words and category", async () => {
    const { run } = setup(endpoints);

    const bySearch = await run("list_api_endpoints", { search: "Segments GEOGRAPHY" });
    const byCategory = await run("list_api_endpoints", { category: "insiders" });
    const none = await run("list_api_endpoints", { search: "segments", category: "insiders" });

    expect((bySearch.data as ApiEndpoint[]).map((e) => e.path)).toEqual([
      "/v1/financials/{issuer}/segments/geography",
    ]);
    expect((byCategory.data as ApiEndpoint[]).map((e) => e.path)).toEqual([
      "/v1/insiders/{ticker}/owners",
    ]);
    expect(none.data).toEqual([]);
  });

  it("call_api_endpoint calls a concrete /v1/ path with its query", async () => {
    const { calls, run } = setup();

    await run("call_api_endpoint", { path: "/v1/insiders/AAPL/owners", query: { limit: 10 } });

    expect(calls).toEqual([{ path: "/v1/insiders/AAPL/owners", query: { limit: 10 } }]);
  });

  it("call_api_endpoint refuses placeholders and anything that is not an API path", async () => {
    const { calls, run } = setup();

    await expect(
      run("call_api_endpoint", { path: "/v1/insiders/{ticker}/owners" }),
    ).rejects.toThrow(/placeholders/);
    for (const path of [
      "https://example.com/v1/x",
      "//example.com/v1/x",
      "/v2/insiders/AAPL/owners",
      "/v1/../admin",
      "/v1/insiders/AAPL/owners?limit=5",
      "/api/core/v3/api-docs",
      "/v1/",
    ]) {
      await expect(run("call_api_endpoint", { path })).rejects.toThrow(/must be an API path/);
    }
    expect(calls).toEqual([]);
  });
});
