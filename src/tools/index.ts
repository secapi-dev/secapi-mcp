import type { ToolModule } from "./types.js";
import { filingsTools } from "./filings/index.js";
import { companiesTools } from "./companies/index.js";
import { financialsTools } from "./financials/index.js";
import { insidersTools } from "./insiders/index.js";
import { institutionsTools } from "./institutions/index.js";

/** All registered tool modules. Add new modules here as the API surface grows. */
export const toolModules: ToolModule[] = [
  filingsTools,
  companiesTools,
  financialsTools,
  insidersTools,
  institutionsTools,
];

export { registerTool, registerTools } from "./registry.js";
export type { ToolContext, ToolDefinition, ToolModule } from "./types.js";
