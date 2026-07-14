import { z } from "zod";
import { createToolResponse } from "../../utils/format.js";
import { dateSchema, paginationSchema, tickerSchema } from "../../schemas/common.js";
import type { ToolModule } from "../types.js";

export const insidersTools: ToolModule = {
  tools: [
    {
      name: "insider_trades",
      description:
        "Search insider trading transactions (Form 4 filings) by company ticker. Filter by buy/sell activity, transaction type, and date range. Returns officer and director trades.",
      inputSchema: paginationSchema.pick({ limit: true }).extend({
        ticker: tickerSchema,
        activity: z
          .enum(["all", "buying", "selling", "latest"])
          .default("all")
          .describe("Filter: all transactions, buying only, selling only, or latest"),
        startDate: dateSchema.optional(),
        endDate: dateSchema.optional(),
        minValue: z.coerce.number().min(0).optional().describe("Minimum transaction value in USD"),
      }),
      examples: [
        'insider_trades({ ticker: "TSLA", activity: "buying", limit: 10 })',
        'insider_trades({ ticker: "NVDA", activity: "latest" })',
      ],
      handler: async (input, { client }) => {
        let response;

        const baseParams = {
          ticker: input.ticker,
          limit: input.limit,
          acceptedFrom: input.startDate,
          transactionFrom: input.endDate,
          minValue: input.minValue,
        };

        switch (input.activity) {
          case "buying":
            response = await client.insiders.transactions({
              ...baseParams,
              acquiredDisposed: "A",
            });
            break;
          case "selling":
            response = await client.insiders.transactions({
              ...baseParams,
              acquiredDisposed: "D",
            });
            break;
          case "latest":
            response = await client.insiders.latest({ ticker: input.ticker, limit: input.limit });
            break;
          default:
            response = await client.insiders.transactions(baseParams);
        }

        const transactions = Array.isArray(response)
          ? response
          : ((response as { data?: unknown[] }).data ?? response);

        return createToolResponse("insider_trades", transactions, {
          summary: `Insider ${input.activity} activity for ${input.ticker}.`,
        });
      },
    },
  ],
};
