import { describe, expect, it } from "vitest";
import { filingsTools } from "../../src/tools/filings/index.js";

describe("search_filings tool", () => {
  const tool = filingsTools.tools.find((t) => t.name === "search_filings")!;

  it("validates input requires ticker or cik at handler level", () => {
    const input = tool.inputSchema.parse({});
    expect(input.ticker).toBeUndefined();
    expect(input.cik).toBeUndefined();
  });

  it("accepts ticker with defaults", () => {
    const input = tool.inputSchema.parse({ ticker: "AAPL" });
    expect(input.ticker).toBe("AAPL");
    expect(input.page).toBe(1);
    expect(input.limit).toBe(20);
  });
});
