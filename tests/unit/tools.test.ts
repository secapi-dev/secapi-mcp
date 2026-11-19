import { describe, expect, it } from "vitest";
import { toolModules } from "../../src/tools/index.js";

describe("tool modules", () => {
  it("registers the curated tools and the two live-documentation tools", () => {
    const names = toolModules.flatMap((m) => m.tools.map((t) => t.name));
    expect(names).toEqual([
      "search_filings",
      "analyze_filing",
      "search_companies",
      "company_overview",
      "latest_financials",
      "company_financials",
      "company_ratios",
      "insider_trades",
      "search_institutions",
      "institution_holdings",
      "list_api_endpoints",
      "call_api_endpoint",
    ]);
  });

  it("every tool has a description and input schema", () => {
    for (const mod of toolModules) {
      for (const tool of mod.tools) {
        expect(tool.description.length).toBeGreaterThan(20);
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.handler).toBe("function");
      }
    }
  });

  it("tool names use snake_case", () => {
    const names = toolModules.flatMap((m) => m.tools.map((t) => t.name));
    for (const name of names) {
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
});
