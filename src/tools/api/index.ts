import { z } from "zod";
import type { ApiEndpoint } from "../../client/openapi.js";
import { createToolResponse } from "../../utils/format.js";
import type { ToolModule } from "../types.js";

/** Above this many matches only path and summary are returned, to keep the answer small. */
const MAX_DETAILED_ENDPOINTS = 15;

const CATEGORIES = ["filings", "entities", "financials", "insiders", "institutions"] as const;

/** A concrete /v1/ path: no placeholders, query string, host or parent segments. */
const API_PATH = /^\/v1\/[A-Za-z0-9._~%-]+(\/[A-Za-z0-9._~%-]+)*$/;

function matches(endpoint: ApiEndpoint, words: string[]): boolean {
  const haystack = [
    endpoint.path,
    endpoint.summary ?? "",
    endpoint.description ?? "",
    ...endpoint.parameters.map((parameter) => parameter.name),
  ]
    .join(" ")
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}

export const apiTools: ToolModule = {
  tools: [
    {
      name: "list_api_endpoints",
      description:
        "List the secapi.dev REST endpoints, read live from the API's own documentation. Use this when no other tool covers what you need (for example segments, metric rankings, insider owners, 13F sector breakdowns), then call the endpoint with call_api_endpoint. Narrow with `search` or `category` to also get each endpoint's parameters.",
      inputSchema: z.object({
        search: z
          .string()
          .trim()
          .optional()
          .describe(
            'Words that must all appear in the path, summary or description, e.g. "segments geography"',
          ),
        category: z.enum(CATEGORIES).optional().describe("Limit to one API area"),
      }),
      examples: [
        'list_api_endpoints({ category: "insiders" })',
        'list_api_endpoints({ search: "segments" })',
      ],
      handler: async (input, { api }) => {
        const words = (input.search ?? "").toLowerCase().split(/\s+/).filter(Boolean);
        const found = (await api.endpoints()).filter(
          (endpoint) =>
            (!input.category || endpoint.category === input.category) && matches(endpoint, words),
        );

        const detailed = found.length <= MAX_DETAILED_ENDPOINTS;
        const data = found.map((endpoint) =>
          detailed
            ? endpoint
            : { path: endpoint.path, category: endpoint.category, summary: endpoint.summary },
        );

        return createToolResponse("list_api_endpoints", data, {
          summary: detailed
            ? `${found.length} endpoint(s), with parameters. All are GET.`
            : `${found.length} endpoints (path and summary only). Add search or category to see parameters. All are GET.`,
        });
      },
    },
    {
      name: "call_api_endpoint",
      description:
        "Call any secapi.dev GET endpoint by path. Use list_api_endpoints first to find the path and its parameters. Replace every {placeholder} in the path with a real value (ticker, CIK, accession number).",
      inputSchema: z.object({
        path: z
          .string()
          .trim()
          .describe(
            'Endpoint path starting with /v1/, e.g. "/v1/financials/AAPL/segments/geography"',
          ),
        query: z
          .record(z.union([z.string(), z.number(), z.boolean()]))
          .optional()
          .describe('Query parameters, e.g. { "limit": 5, "period": "2025" }'),
      }),
      examples: [
        'call_api_endpoint({ path: "/v1/insiders/AAPL/owners", query: { limit: 10 } })',
        'call_api_endpoint({ path: "/v1/financials/metrics/top", query: { metric: "Revenue", limit: 10 } })',
      ],
      handler: async (input, { client }) => {
        if (/[{}]/.test(input.path)) {
          throw new Error(
            "Replace the {placeholders} in the path with real values before calling the endpoint.",
          );
        }
        if (!API_PATH.test(input.path) || input.path.split("/").includes("..")) {
          throw new Error(
            'path must be an API path that starts with /v1/, without a host or query string (pass query parameters in "query").',
          );
        }

        const data = await client.get<unknown>(input.path, input.query);

        return createToolResponse("call_api_endpoint", data, {
          summary: `GET ${input.path}`,
        });
      },
    },
  ],
};
