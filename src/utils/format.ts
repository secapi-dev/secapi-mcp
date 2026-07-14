import type { Pagination } from "secapi-node";

export interface ToolResponseMeta {
  tool: string;
  timestamp: string;
  pagination?: PaginationMeta;
  summary?: string;
}

export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasMore?: boolean;
}

export interface ToolResponse<T = unknown> {
  meta: ToolResponseMeta;
  data: T;
}

function definedEntries<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export function normalizePagination(pagination?: Pagination): PaginationMeta | undefined {
  if (!pagination) return undefined;

  const meta = definedEntries({
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    totalPages: pagination.totalPages,
    hasMore: pagination.hasMoreData,
  });

  return Object.keys(meta).length > 0 ? meta : undefined;
}

export function createToolResponse<T>(
  tool: string,
  data: T,
  options?: {
    pagination?: Pagination;
    summary?: string;
  },
): ToolResponse<T> {
  const meta: ToolResponseMeta = {
    tool,
    timestamp: new Date().toISOString(),
  };

  const pagination = normalizePagination(options?.pagination);
  if (pagination) meta.pagination = pagination;
  if (options?.summary) meta.summary = options.summary;

  return { meta, data };
}

export function toJsonContent(payload: unknown): { type: "text"; text: string } {
  return {
    type: "text",
    text: JSON.stringify(payload, null, 2),
  };
}

function toolOptions(pagination?: Pagination, summary?: string) {
  const options: { pagination?: Pagination; summary?: string } = {};
  if (pagination) options.pagination = pagination;
  if (summary) options.summary = summary;
  return options;
}

export { toolOptions };
