import { z } from "zod";
import { createToolResponse, toolOptions } from "../../utils/format.js";
import {
  dateRangeSchema,
  formTypesSchema,
  paginationSchema,
  tickerSchema,
  cikSchema,
} from "../../schemas/common.js";
import type { ToolModule } from "../types.js";

const searchFilingsInput = paginationSchema
  .extend({
    ticker: tickerSchema.optional(),
    cik: cikSchema.optional(),
    form: formTypesSchema,
  })
  .merge(dateRangeSchema);

export const filingsTools: ToolModule = {
  tools: [
    {
      name: "search_filings",
      description:
        "Search SEC EDGAR filings by company ticker or CIK. Filter by form type (10-K, 10-Q, 8-K, etc.) and date range. Use for discovering recent or historical regulatory filings.",
      inputSchema: searchFilingsInput,
      examples: [
        'search_filings({ ticker: "AAPL", form: ["10-K", "10-Q"], limit: 5 })',
        'search_filings({ cik: "0000320193", startDate: "2024-01-01" })',
      ],
      handler: async (input, { client }) => {
        if (!input.ticker && !input.cik) {
          throw new Error("Provide at least one of ticker or cik");
        }

        const response = await client.filings.search({
          ticker: input.ticker,
          cik: input.cik,
          form: input.form,
          startDate: input.startDate,
          endDate: input.endDate,
          page: input.page,
          limit: input.limit,
        });

        const filings = response.data ?? [];
        return createToolResponse(
          "search_filings",
          filings,
          toolOptions(
            response.pagination,
            `Found ${filings.length} filing(s) matching the search criteria.`,
          ),
        );
      },
    },
    {
      name: "analyze_filing",
      description:
        "Retrieve a filing's metadata and list of attached documents (HTML, XBRL, exhibits). Use when you need to understand filing contents before deeper analysis. Requires CIK and accession number.",
      inputSchema: z.object({
        cik: cikSchema,
        accessionNumber: z
          .string()
          .trim()
          .min(1, "Accession number is required (e.g. 0000320193-24-000123)"),
      }),
      examples: ['analyze_filing({ cik: "0000320193", accessionNumber: "0000320193-24-000123" })'],
      handler: async (input, { client }) => {
        const [filing, documents] = await Promise.all([
          client.filings.retrieve(input.cik, input.accessionNumber),
          client.filings.documents(input.cik, input.accessionNumber),
        ]);

        return createToolResponse(
          "analyze_filing",
          {
            filing,
            documents,
            documentCount: documents.length,
          },
          {
            summary: `Filing ${input.accessionNumber} has ${documents.length} document(s).`,
          },
        );
      },
    },
  ],
};
