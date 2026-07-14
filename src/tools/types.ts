import { z, type ZodObject, type ZodRawShape } from "zod";
import type { SecApiClient } from "../client/secapi-client.js";
import type { Logger } from "../logging/index.js";

export interface ToolContext {
  client: SecApiClient;
  logger: Logger;
}

export type ToolHandler<TInput> = (input: TInput, ctx: ToolContext) => Promise<unknown>;

export interface ToolDefinition<TShape extends ZodRawShape = ZodRawShape> {
  name: string;
  description: string;
  inputSchema: ZodObject<TShape>;
  handler: ToolHandler<z.infer<ZodObject<TShape>>>;
  examples?: string[];
}

export interface ToolModule {
  tools: ToolDefinition[];
}
