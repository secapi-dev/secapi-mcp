import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config/index.js";
import { createApiCatalog } from "../client/openapi.js";
import { createSecApiClient } from "../client/secapi-client.js";
import type { Logger } from "../logging/index.js";
import { registerTools, toolModules } from "../tools/index.js";

const SERVER_NAME = "secapi-mcp";
const SERVER_VERSION = "0.1.0";

export function createMcpServer(config: Config, logger: Logger): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  const client = createSecApiClient(config, logger);
  const api = createApiCatalog(
    config.openApiUrl ?? `${config.baseUrl.replace(/\/+$/, "")}/api/core/v3/api-docs`,
  );
  registerTools(server, toolModules, client, logger, api);

  return server;
}
