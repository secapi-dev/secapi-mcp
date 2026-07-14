import { describe, expect, it } from "vitest";
import { toolModules } from "../../src/tools/index.js";

describe("tool modules", () => {
  it("registers 9 exemplary tools", () => {
    const names = toolModules.flatMap((m) => m.tools.map((t) => t.name));
    expect(names).toHaveLength(9);
    expect(names).toEqual([
      "search_filings",
      "analyze_filing",
      "search_companies",
      "company_overview",
      "company_financials",
      "company_ratios",
      "insider_trades",
      "search_institutions",
      "institution_holdings",
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
