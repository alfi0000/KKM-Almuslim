import pino from "pino";

const REDACTED = "[REDACTED]";

const SENSITIVE_KEYS = [
  "password",
  "passwd",
  "secret",
  "token",
  "authorization",
  "cookie",
  "api_key",
  "apikey",
  "api_secret",
  "service_role",
  "password_hash",
];

function redactStrings(value: string): string {
  return value
    .replace(/([a-z][a-z0-9+.-]*:\/\/[^\s:/]+:)[^@\s]+@/gi, "$1[REDACTED]@")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+\b/gi, `Bearer ${REDACTED}`)
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, REDACTED);
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[MAX_DEPTH]";
  if (typeof value === "string") return redactStrings(value).slice(0, 2_000);
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEYS.includes(key.toLowerCase()) ? REDACTED : sanitize(item, depth + 1);
  }
  return result;
}

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: SENSITIVE_KEYS.map((key) => `*.${key}`).concat(SENSITIVE_KEYS),
    censor: REDACTED,
  },
  base: undefined,
});

export const log = {
  /** Log berisi objek — otomatis disanitasi (password/token/PII direduksi). */
  info(obj: Record<string, unknown>, msg?: string) {
    logger.info(sanitize(obj) as Record<string, unknown>, msg);
  },
  warn(obj: Record<string, unknown>, msg?: string) {
    logger.warn(sanitize(obj) as Record<string, unknown>, msg);
  },
  error(obj: Record<string, unknown>, msg?: string) {
    logger.error(sanitize(obj) as Record<string, unknown>, msg);
  },
};

export default logger;
