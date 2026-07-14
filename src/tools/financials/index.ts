import { z } from "zod";
import { createToolResponse } from "../../utils/format.js";
import { identifierSchema } from "../../schemas/common.js";
import type { ToolModule } from "../types.js";

const statementTypeSchema = z
  .enum(["income", "balance", "cash_flow"])
  .default("income")
  .describe("Financial statement type: income, balance, or cash_flow");

export const financialsTools: ToolModule = {
  tools: [
    {
      name: "company_financials",
      description:
        "Retrieve standardized financial statements for a company — income statement, balance sheet, or cash flow. Uses the latest available filing when no accession number is provided.",
      inputSchema: z.object({
        identifier: identifierSchema.describe("Company ticker or CIK"),
        statement: statementTypeSchema,
        accessionNumber: z
          .string()
          .trim()
          .optional()
          .describe("Optional specific filing accession number"),
      }),
      examples: [
        'company_financials({ identifier: "MSFT", statement: "income" })',
        'company_financials({ identifier: "AAPL", statement: "balance" })',
      ],
      handler: async (input, { client }) => {
        const lookup = { ticker: input.identifier };
        let statement;

        switch (input.statement) {
          case "balance":
            statement = await client.financials.balanceSheet(input.accessionNumber, lookup);
            break;
          case "cash_flow":
            statement = await client.financials.cashFlow(input.accessionNumber, lookup);
            break;
          default:
            statement = await client.financials.incomeStatement(input.accessionNumber, lookup);
        }

        return createToolResponse("company_financials", statement, {
          summary: `${input.statement.replace("_", " ")} statement for ${input.identifier}.`,
        });
      },
    },
    {
      name: "company_ratios",
      description:
        "Get financial ratio time series for a company (profitability, liquidity, leverage, efficiency). Useful for valuation and comparative analysis.",
      inputSchema: z.object({
        identifier: identifierSchema.describe("Company ticker or CIK"),
        ratio: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe('Specific ratio(s) e.g. "roe", "current_ratio". Omit for all available.'),
        limit: z.coerce.number().int().min(1).max(40).default(8),
      }),
      examples: [
        'company_ratios({ identifier: "AAPL", ratio: "roe" })',
        'company_ratios({ identifier: "GOOGL", limit: 12 })',
      ],
      handler: async (input, { client }) => {
        const isNumeric = /^\d+$/.test(input.identifier);
        const response = await client.financials.ratios({
          ticker: isNumeric ? undefined : input.identifier,
          cik: isNumeric ? input.identifier : undefined,
          ratio: input.ratio,
          limit: input.limit,
        });

        return createToolResponse("company_ratios", response, {
          summary: `Financial ratios for ${input.identifier}.`,
        });
      },
    },
  ],
};
