import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config/index.js";

describe("loadConfig", () => {
  it("loads config from environment variables", () => {
    const config = loadConfig({
      SECAPI_API_KEY: "test-key",
      SECAPI_BASE_URL: "https://api.secapi.dev",
      SECAPI_TIMEOUT_MS: "15000",
      SECAPI_DEBUG: "true",
    });

    expect(config.apiKey).toBe("test-key");
    expect(config.baseUrl).toBe("https://api.secapi.dev");
    expect(config.timeoutMs).toBe(15000);
    expect(config.debug).toBe(true);
  });

  it("falls back to SEC_API_KEY", () => {
    const config = loadConfig({ SEC_API_KEY: "legacy-key" });
    expect(config.apiKey).toBe("legacy-key");
  });

  it("throws when API key is missing", () => {
    expect(() => loadConfig({})).toThrow(/API key is required/);
  });
});
