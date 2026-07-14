import { z } from "zod";
import { createToolResponse, toolOptions } from "../../utils/format.js";
import { cikSchema, paginationSchema } from "../../schemas/common.js";
import type { ToolModule } from "../types.js";

export const institutionsTools: ToolModule = {
  tools: [
    {
      name: "search_institutions",
      description:
        "Search institutional investment managers (13F filers) by name or CIK. Returns hedge funds, asset managers, and other institutions that file Form 13F.",
      inputSchema: paginationSchema.extend({
        query: z.string().trim().min(1).optional().describe("Institution name search query"),
      }),
      examples: [
        'search_institutions({ query: "Berkshire" })',
        'search_institutions({ query: "Vanguard", limit: 5 })',
      ],
      handler: async (input, { client }) => {
        const response = await client.institutions.list({
          q: input.query,
          page: input.page,
          limit: input.limit,
        });

        const institutions = response.data ?? [];
        return createToolResponse(
          "search_institutions",
          institutions,
          toolOptions(response.pagination, `Found ${institutions.length} institution(s).`),
        );
      },
    },
    {
      name: "institution_holdings",
      description:
        "Get an institutional investor's 13F portfolio holdings for a given quarter. Shows positions, share counts, and market values. Requires institution CIK.",
      inputSchema: z.object({
        cik: cikSchema.describe("Institution CIK (10 digits, zero-padded)"),
        quarter: z
          .string()
          .trim()
          .optional()
          .describe('Reporting quarter e.g. "2024-Q3". Defaults to latest available.'),
        limit: z.coerce.number().int().min(1).max(100).default(25),
        sort: z
          .enum(["value", "shares", "weight"])
          .default("value")
          .describe("Sort holdings by market value, share count, or portfolio weight"),
      }),
      examples: [
        'institution_holdings({ cik: "0001067983", quarter: "2024-Q3" })',
        'institution_holdings({ cik: "0001166559", limit: 50, sort: "weight" })',
      ],
      handler: async (input, { client }) => {
        const [profile, holdings] = await Promise.all([
          client.institutions.profile(input.cik, { quarter: input.quarter }),
          client.institutions.holdings(input.cik, {
            quarter: input.quarter,
            limit: input.limit,
            sort: input.sort,
          }),
        ]);

        return createToolResponse(
          "institution_holdings",
          {
            profile,
            holdings,
          },
          {
            summary: `13F holdings for institution ${input.cik}${input.quarter ? ` (${input.quarter})` : ""}.`,
          },
        );
      },
    },
  ],
};
