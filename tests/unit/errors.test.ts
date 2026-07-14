import { describe, expect, it } from "vitest";
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  MissingApiKeyError,
} from "secapi-node";
import { categorizeError } from "../../src/errors/index.js";

describe("categorizeError", () => {
  it("categorizes authentication errors", () => {
    const result = categorizeError(new MissingApiKeyError());
    expect(result.category).toBe("authentication");
    expect(result.retryable).toBe(false);
    expect(result.suggestion).toContain("SECAPI_API_KEY");
  });

  it("categorizes rate limit errors as retryable", () => {
    const result = categorizeError(new RateLimitError("Too many requests", { statusCode: 429 }));
    expect(result.category).toBe("rate_limit");
    expect(result.retryable).toBe(true);
  });

  it("categorizes not found errors", () => {
    const result = categorizeError(new NotFoundError("Not found", { statusCode: 404 }));
    expect(result.category).toBe("not_found");
    expect(result.retryable).toBe(false);
  });

  it("categorizes auth status errors", () => {
    const result = categorizeError(new AuthenticationError("Invalid key", { statusCode: 401 }));
    expect(result.category).toBe("authentication");
    expect(result.statusCode).toBe(401);
  });
});
