import { SECClient } from "secapi-node";
import type { Config } from "../config/index.js";
import type { Logger } from "../logging/index.js";

export type SecApiClient = SECClient;

export function createSecApiClient(config: Config, logger: Logger): SecApiClient {
  logger.debug("Initializing secapi client", {
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
  });

  return new SECClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    defaultHeaders: {
      "User-Agent": config.userAgent,
    },
  });
}
