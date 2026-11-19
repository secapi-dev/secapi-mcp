import { z } from "zod";
import type { Pagination } from "secapi-node";
import { createToolResponse, toolOptions } from "../../utils/format.js";
import { dateSchema, paginationSchema, tickerSchema } from "../../schemas/common.js";
import type { ToolModule } from "../types.js";

/** Path segment: a ticker or a CIK. */
function insiderFeedPath(ticker: string | undefined): string {
  return ticker
    ? `/v1/insiders/${encodeURIComponent(ticker)}/transactions`
    : "/v1/insiders/transactions";
}

export const insidersTools: ToolModule = {
  tools: [
    {
      name: "insider_trades",
      description:
        'Insider transactions from Form 4 filings, newest first, for one company or market-wide. "buying" and "selling" return open-market purchases and sales only (transaction codes P and S); grants, option exercises, tax withholding and gifts are excluded. Each row carries the filing\'s form type; an `amendment` row (Form 4/A) replaces the line it restates.',
      inputSchema: paginationSchema.extend({
        ticker: tickerSchema
          .optional()
          .describe("Company ticker or CIK. Omit for the market-wide feed."),
        activity: z
          .enum(["all", "buying", "selling", "latest"])
          .default("all")
          .describe(
            "all = every transaction type; buying / selling = open-market purchases / sales only; latest = the newest transactions, ignoring the date and value filters",
          ),
        startDate: dateSchema
          .optional()
          .describe("Filing accepted on or after this date (YYYY-MM-DD)"),
        endDate: dateSchema
          .optional()
          .describe("Filing accepted on or before this date (YYYY-MM-DD)"),
        minValue: z.coerce.number().min(0).optional().describe("Minimum transaction value in USD"),
      }),
      examples: [
        'insider_trades({ ticker: "TSLA", activity: "buying", limit: 10 })',
        'insider_trades({ ticker: "NVDA", startDate: "2026-01-01", endDate: "2026-03-31" })',
        'insider_trades({ activity: "buying", minValue: 1000000 })',
      ],
      handler: async (input, { client }) => {
        const query: Record<string, string | number | boolean | undefined> = {
          limit: input.limit,
          page: input.page,
        };

        if (input.activity !== "latest") {
          query.acceptedFrom = input.startDate;
          query.acceptedTo = input.endDate;
          query.minValue = input.minValue;
        }
        if (input.activity === "buying" || input.activity === "selling") {
          query.transactionCode = input.activity === "buying" ? "P" : "S";
          query.derivative = false;
        }

        const response = await client.get<{ transactions?: unknown[]; pagination?: Pagination }>(
          insiderFeedPath(input.ticker),
          query,
        );
        const transactions = response.transactions ?? [];

        return createToolResponse(
          "insider_trades",
          transactions,
          toolOptions(
            response.pagination,
            `${transactions.length} insider transaction(s), ${input.activity}, ${input.ticker ?? "all companies"}.`,
          ),
        );
      },
    },
  ],
};
