import { z } from "zod";

const positiveInt = z.coerce.number().int().positive();

export const configSchema = z.object({
  apiKey: z.string().min(1, "API key is required. Set SECAPI_API_KEY or pass --api-key."),
  baseUrl: z.string().url().default("https://api.secapi.dev"),
  timeoutMs: positiveInt.default(30_000),
  maxRetries: z.coerce.number().int().min(0).max(5).default(2),
  debug: z.coerce.boolean().default(false),
  userAgent: z.string().default("secapi-mcp/0.1.0"),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const apiKey = env.SECAPI_API_KEY?.trim() || env.SEC_API_KEY?.trim() || "";

  return configSchema.parse({
    apiKey,
    baseUrl: env.SECAPI_BASE_URL,
    timeoutMs: env.SECAPI_TIMEOUT_MS,
    maxRetries: env.SECAPI_MAX_RETRIES,
    debug: env.SECAPI_DEBUG,
    userAgent: env.SECAPI_USER_AGENT,
  });
}
