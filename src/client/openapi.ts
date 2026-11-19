/**
 * Reads the OpenAPI document the API publishes, so the server can describe and call
 * endpoints that have no dedicated tool yet. Cached in memory; a failed refresh keeps
 * serving the previous copy.
 */
export interface ApiParameter {
  name: string;
  in: string;
  required: boolean;
  description?: string;
  allowedValues?: string[];
  default?: unknown;
}

export interface ApiEndpoint {
  path: string;
  category: string;
  summary?: string;
  description?: string;
  parameters: ApiParameter[];
}

export interface ApiCatalog {
  endpoints(): Promise<ApiEndpoint[]>;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const CACHE_TTL_MS = 10 * 60_000;
const FETCH_TIMEOUT_MS = 20_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseParameter(raw: unknown): ApiParameter | undefined {
  if (!isRecord(raw)) return undefined;
  const name = asString(raw.name);
  if (!name) return undefined;

  const schema = isRecord(raw.schema) ? raw.schema : {};
  const parameter: ApiParameter = {
    name,
    in: asString(raw.in) ?? "query",
    required: raw.required === true,
  };
  const description = asString(raw.description);
  if (description) parameter.description = description;
  if (Array.isArray(schema.enum)) parameter.allowedValues = schema.enum.map(String);
  if (schema.default !== undefined) parameter.default = schema.default;
  return parameter;
}

/** GET operations of an OpenAPI document, in document order. */
export function parseOpenApi(document: unknown): ApiEndpoint[] {
  if (!isRecord(document) || !isRecord(document.paths)) {
    throw new Error("The API documentation is not an OpenAPI document.");
  }

  const endpoints: ApiEndpoint[] = [];
  for (const [path, operations] of Object.entries(document.paths)) {
    if (!isRecord(operations) || !isRecord(operations.get)) continue;
    const operation = operations.get;

    const endpoint: ApiEndpoint = {
      path,
      category: path.split("/")[2] ?? "",
      parameters: (Array.isArray(operation.parameters) ? operation.parameters : [])
        .map(parseParameter)
        .filter((parameter): parameter is ApiParameter => parameter !== undefined),
    };
    const summary = asString(operation.summary);
    if (summary) endpoint.summary = summary;
    const description = asString(operation.description);
    if (description) endpoint.description = description;
    endpoints.push(endpoint);
  }
  return endpoints;
}

export function createApiCatalog(url: string, fetchImpl: FetchLike = fetch): ApiCatalog {
  let cached: { endpoints: ApiEndpoint[]; loadedAt: number } | undefined;

  return {
    async endpoints(): Promise<ApiEndpoint[]> {
      if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
        return cached.endpoints;
      }
      try {
        const response = await fetchImpl(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        cached = { endpoints: parseOpenApi(await response.json()), loadedAt: Date.now() };
        return cached.endpoints;
      } catch (error) {
        if (cached) return cached.endpoints;
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not load the API documentation from ${url}: ${reason}`);
      }
    },
  };
}
