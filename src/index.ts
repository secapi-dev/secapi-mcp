import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config/index.js";
import { createLogger } from "./logging/index.js";
import { createMcpServer } from "./server/create-server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.debug);

  logger.info("Starting secapi-mcp server", {
    baseUrl: config.baseUrl,
    version: "0.1.0",
  });

  const server = createMcpServer(config, logger);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logger.info("secapi-mcp connected via stdio");
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      level: "error",
      message: "Failed to start secapi-mcp",
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});
