import { z } from "zod";
import { createToolResponse, toolOptions } from "../../utils/format.js";
import { identifierSchema, paginationSchema } from "../../schemas/common.js";
import type { ToolModule } from "../types.js";

export const companiesTools: ToolModule = {
  tools: [
    {
      name: "search_companies",
      description:
        "Search SEC-registered companies by name, ticker, or CIK. Returns entity metadata including company name, ticker, CIK, and entity type.",
      inputSchema: paginationSchema.extend({
        query: z.string().trim().min(1, "Search query is required").optional(),
        ticker: z.string().trim().optional(),
        cik: z.string().trim().optional(),
      }),
      examples: ['search_companies({ query: "Apple" })', 'search_companies({ ticker: "MSFT" })'],
      handler: async (input, { client }) => {
        const response = await client.entities.list({
          q: input.query,
          ticker: input.ticker,
          cik: input.cik,
          page: input.page,
          limit: input.limit,
        });

        const companies = response.data ?? [];
        return createToolResponse(
          "search_companies",
          companies,
          toolOptions(response.pagination, `Found ${companies.length} company(ies).`),
        );
      },
    },
    {
      name: "company_overview",
      description:
        "Get a comprehensive overview of a public company by ticker or CIK, including recent SEC filings. Ideal starting point for company research.",
      inputSchema: z.object({
        identifier: identifierSchema.describe("Company ticker (e.g. AAPL) or CIK"),
        filingLimit: z.coerce.number().int().min(1).max(20).default(5),
      }),
      examples: [
        'company_overview({ identifier: "AAPL" })',
        'company_overview({ identifier: "0000320193", filingLimit: 10 })',
      ],
      handler: async (input, { client }) => {
        const [entity, filings] = await Promise.all([
          client.entities.get(input.identifier),
          client.entities.filings(input.identifier, { limit: input.filingLimit }),
        ]);

        return createToolResponse(
          "company_overview",
          {
            entity,
            recentFilings: filings.data ?? [],
          },
          toolOptions(
            filings.pagination,
            `Overview for ${String(entity.name ?? input.identifier)} with ${(filings.data ?? []).length} recent filing(s).`,
          ),
        );
      },
    },
  ],
};
