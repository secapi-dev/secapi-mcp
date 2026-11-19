import { z } from "zod";
import { createToolResponse } from "../../utils/format.js";
import { identifierSchema } from "../../schemas/common.js";
import type { ToolModule } from "../types.js";

const statementTypeSchema = z
  .enum(["income", "balance", "cash_flow"])
  .default("income")
  .describe("Financial statement type: income, balance, or cash_flow");

/** API path segment for each statement. */
const STATEMENT_SLUGS = {
  income: "income-statement",
  balance: "balance-sheet",
  cash_flow: "cash-flow",
} as const;

const DEFAULT_PERIODS = 4;

export const financialsTools: ToolModule = {
  tools: [
    {
      name: "latest_financials",
      description:
        'Get a company\'s most recent 10-K or 10-Q in one call: standardized income statement, balance sheet and cash flow, plus the filing they come from. Best starting point for "how is this company doing". A statement is null when it could not be standardized for that filing.',
      inputSchema: z.object({
        identifier: identifierSchema.describe("Company ticker or CIK"),
        period: z
          .enum(["annual", "quarterly"])
          .optional()
          .describe(
            "annual = latest 10-K, quarterly = latest 10-Q. Omit for whichever is most recent.",
          ),
      }),
      examples: [
        'latest_financials({ identifier: "AAPL" })',
        'latest_financials({ identifier: "MSFT", period: "annual" })',
      ],
      handler: async (input, { client }) => {
        const response = await client.get<unknown>(
          `/v1/financials/${encodeURIComponent(input.identifier)}/latest`,
          { period: input.period },
        );

        return createToolResponse("latest_financials", response, {
          summary: `Latest ${input.period ?? "reported"} financials for ${input.identifier}.`,
        });
      },
    },
    {
      name: "company_financials",
      description:
        'Retrieve one financial statement for a company — income statement, balance sheet, or cash flow. By default returns the standardized statement for the most recent periods (comparable across companies and over time). Use view "as_reported" for every line item exactly as filed, or pass an accession number for one specific filing.',
      inputSchema: z.object({
        identifier: identifierSchema.describe("Company ticker or CIK"),
        statement: statementTypeSchema,
        view: z
          .enum(["standardized", "as_reported"])
          .default("standardized")
          .describe(
            "standardized = comparable metrics over several periods; as_reported = the filing's own line items",
          ),
        period: z
          .enum(["annual", "quarterly", "ytd"])
          .optional()
          .describe(
            "annual = fiscal years (default for standardized), quarterly = single quarters, ytd = year-to-date spans from 10-Qs (the complete series for cash flow). For as_reported: annual = latest 10-K, quarterly = latest 10-Q, omit for the most recent filing.",
          ),
        limit: z.coerce
          .number()
          .int()
          .min(1)
          .max(40)
          .default(DEFAULT_PERIODS)
          .describe("Number of most recent periods (standardized view only)"),
        accessionNumber: z
          .string()
          .trim()
          .optional()
          .describe("Optional specific filing accession number; period and limit are then ignored"),
      }),
      examples: [
        'company_financials({ identifier: "MSFT", statement: "income" })',
        'company_financials({ identifier: "AAPL", statement: "cash_flow", period: "ytd", limit: 8 })',
        'company_financials({ identifier: "AAPL", statement: "balance", view: "as_reported" })',
      ],
      handler: async (input, { client }) => {
        const slug = STATEMENT_SLUGS[input.statement as keyof typeof STATEMENT_SLUGS];
        const standardized = input.view === "standardized";
        let path: string;
        let query: Record<string, string | number | undefined> = {};

        if (input.accessionNumber) {
          path = `/v1/financials/filings/${encodeURIComponent(input.accessionNumber)}/statements/${slug}`;
          if (standardized) path += "/standardized";
        } else if (standardized) {
          path = `/v1/financials/${encodeURIComponent(input.identifier)}/statements/${slug}/standardized`;
          query = { period: input.period ?? "annual", limit: input.limit };
        } else {
          path = `/v1/financials/${encodeURIComponent(input.identifier)}/statements/${slug}`;
          // As filed there is no year-to-date variant: a 10-Q is a 10-Q.
          query = { period: input.period === "ytd" ? "quarterly" : input.period };
        }

        const statement = await client.get<unknown>(path, query);

        return createToolResponse("company_financials", statement, {
          summary: `${input.statement.replace("_", " ")} statement for ${input.identifier} (${input.view.replace("_", " ")}).`,
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
