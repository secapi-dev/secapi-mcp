import { z } from "zod";

export const tickerSchema = z
  .string()
  .trim()
  .min(1, "Ticker is required")
  .max(10, "Ticker must be at most 10 characters")
  .transform((v) => v.toUpperCase());

export const cikSchema = z
  .string()
  .trim()
  .min(1, "CIK is required")
  .regex(/^\d{1,10}$/, "CIK must be 1–10 digits");

export const identifierSchema = z.string().trim().min(1, "Identifier (ticker or CIK) is required");

export const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const formTypesSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    return Array.isArray(v) ? v : [v];
  });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
