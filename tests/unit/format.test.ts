import { describe, expect, it } from "vitest";
import { createToolResponse, normalizePagination } from "../../src/utils/format.js";

describe("createToolResponse", () => {
  it("wraps data with metadata", () => {
    const result = createToolResponse("search_filings", [{ id: 1 }], {
      summary: "Found 1 filing",
      pagination: { page: 1, limit: 20, total: 1, hasMoreData: false },
    });

    expect(result.meta.tool).toBe("search_filings");
    expect(result.meta.summary).toBe("Found 1 filing");
    expect(result.meta.pagination?.hasMore).toBe(false);
    expect(result.data).toEqual([{ id: 1 }]);
  });
});

describe("normalizePagination", () => {
  it("maps hasMoreData to hasMore", () => {
    expect(normalizePagination({ page: 2, hasMoreData: true })).toEqual({
      page: 2,
      hasMore: true,
    });
  });
});
