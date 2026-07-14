import { describe, expect, it } from "vitest";
import { paginationSchema, tickerSchema } from "../../src/schemas/common.js";

describe("tickerSchema", () => {
  it("uppercases tickers", () => {
    expect(tickerSchema.parse("aapl")).toBe("AAPL");
  });

  it("rejects empty tickers", () => {
    expect(() => tickerSchema.parse("")).toThrow();
  });
});

describe("paginationSchema", () => {
  it("applies defaults", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it("coerces string numbers", () => {
    expect(paginationSchema.parse({ page: "2", limit: "50" })).toEqual({
      page: 2,
      limit: 50,
    });
  });

  it("rejects limit above 100", () => {
    expect(() => paginationSchema.parse({ limit: 200 })).toThrow();
  });
});
