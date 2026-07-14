import {
  APIConnectionError,
  APIStatusError,
  APITimeoutError,
  AuthenticationError,
  MissingApiKeyError,
  NotFoundError,
  RateLimitError,
  SecApiError,
  ValidationError,
} from "secapi-node";

export type McpErrorCategory =
  | "authentication"
  | "rate_limit"
  | "network"
  | "validation"
  | "not_found"
  | "api"
  | "timeout"
  | "internal";

export interface McpErrorPayload {
  category: McpErrorCategory;
  message: string;
  suggestion?: string;
  statusCode?: number;
  requestId?: string;
  retryable: boolean;
}

function addApiFields(
  payload: McpErrorPayload,
  statusCode?: number,
  requestId?: string,
): McpErrorPayload {
  if (statusCode !== undefined) payload.statusCode = statusCode;
  if (requestId !== undefined) payload.requestId = requestId;
  return payload;
}

export function categorizeError(error: unknown): McpErrorPayload {
  if (error instanceof MissingApiKeyError || error instanceof AuthenticationError) {
    return addApiFields(
      {
        category: "authentication",
        message: error.message,
        suggestion:
          "Set SECAPI_API_KEY in your environment or MCP client config. Get a key at https://secapi.dev.",
        retryable: false,
      },
      error instanceof AuthenticationError ? error.statusCode : undefined,
      error instanceof AuthenticationError ? error.requestId : undefined,
    );
  }

  if (error instanceof RateLimitError) {
    return addApiFields(
      {
        category: "rate_limit",
        message: error.message,
        suggestion: "Wait a moment and retry, or upgrade your secapi.dev plan for higher limits.",
        retryable: true,
      },
      error.statusCode,
      error.requestId,
    );
  }

  if (error instanceof APITimeoutError) {
    return {
      category: "timeout",
      message: error.message,
      suggestion:
        "The request took too long. Try narrowing filters or increasing SECAPI_TIMEOUT_MS.",
      retryable: true,
    };
  }

  if (error instanceof APIConnectionError) {
    return {
      category: "network",
      message: error.message,
      suggestion: "Check your network connection and that api.secapi.dev is reachable.",
      retryable: true,
    };
  }

  if (error instanceof ValidationError) {
    return addApiFields(
      {
        category: "validation",
        message: error.message,
        suggestion:
          "Review the tool arguments and ensure required identifiers (ticker, CIK, accession number) are valid.",
        retryable: false,
      },
      error.statusCode,
      error.requestId,
    );
  }

  if (error instanceof NotFoundError) {
    return addApiFields(
      {
        category: "not_found",
        message: error.message,
        suggestion:
          "Verify the ticker, CIK, or accession number exists and is formatted correctly.",
        retryable: false,
      },
      error.statusCode,
      error.requestId,
    );
  }

  if (error instanceof APIStatusError) {
    return addApiFields(
      {
        category: "api",
        message: error.message,
        retryable: error.statusCode >= 500,
      },
      error.statusCode,
      error.requestId,
    );
  }

  if (error instanceof SecApiError) {
    return {
      category: "api",
      message: error.message,
      retryable: false,
    };
  }

  if (error instanceof Error) {
    return {
      category: "internal",
      message: error.message,
      retryable: false,
    };
  }

  return {
    category: "internal",
    message: "An unexpected error occurred.",
    retryable: false,
  };
}

export function formatErrorForLlm(error: unknown): string {
  return JSON.stringify(categorizeError(error), null, 2);
}
