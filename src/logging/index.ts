export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

const SENSITIVE_KEYS = /api[_-]?key|authorization|secret|token|password/i;

function sanitize(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.test(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitize(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function formatLine(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
  debug = false,
): string {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...sanitize(meta),
  };

  if (debug) {
    return JSON.stringify(payload, null, 2);
  }
  return JSON.stringify(payload);
}

export function createLogger(debug = false): Logger {
  const write = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
    const line = formatLine(level, message, meta, debug);
    if (level === "error" || level === "warn") {
      console.error(line);
    } else if (debug || level === "info") {
      console.error(line);
    }
  };

  return {
    debug: (message, meta) => write("debug", message, meta),
    info: (message, meta) => write("info", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    error: (message, meta) => write("error", message, meta),
  };
}
