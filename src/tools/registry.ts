import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatErrorForLlm } from "../errors/index.js";
import type { Logger } from "../logging/index.js";
import { toJsonContent } from "../utils/format.js";
import type { SecApiClient } from "../client/secapi-client.js";
import type { ToolContext, ToolDefinition, ToolModule } from "./types.js";

function buildDescription(tool: ToolDefinition): string {
  const parts = [tool.description];
  if (tool.examples?.length) {
    parts.push("\n\nExamples:\n" + tool.examples.map((e) => `- ${e}`).join("\n"));
  }
  return parts.join("");
}

export function registerTool(server: McpServer, tool: ToolDefinition, ctx: ToolContext): void {
  server.tool(tool.name, buildDescription(tool), tool.inputSchema.shape, async (input) => {
    const started = Date.now();
    ctx.logger.debug("Tool invoked", { tool: tool.name });

    try {
      const parsed = tool.inputSchema.parse(input);
      const result = await tool.handler(parsed, ctx);

      ctx.logger.info("Tool completed", {
        tool: tool.name,
        durationMs: Date.now() - started,
      });

      return {
        content: [toJsonContent(result)],
      };
    } catch (error) {
      ctx.logger.error("Tool failed", {
        tool: tool.name,
        durationMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: formatErrorForLlm(error),
          },
        ],
      };
    }
  });
}

export function registerTools(
  server: McpServer,
  modules: ToolModule[],
  client: SecApiClient,
  logger: Logger,
): void {
  const ctx: ToolContext = { client, logger };

  for (const mod of modules) {
    for (const tool of mod.tools) {
      registerTool(server, tool, ctx);
    }
  }

  const count = modules.reduce((n, m) => n + m.tools.length, 0);
  logger.info("Registered MCP tools", { count });
}
