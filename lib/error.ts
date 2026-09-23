import crypto from "node:crypto";
import { after } from "next/server";
import { log } from "./logger";
import { notifyTelegramServerError } from "./telegram";

const DEFAULT_CLIENT_MESSAGE = "Terjadi kesalahan pada server. Silakan hubungi admin.";
const MIN_ERROR_STATUS = 400;
const MAX_ERROR_STATUS = 599;
const MAX_CLIENT_MESSAGE_LENGTH = 500;
const MAX_LOG_VALUE_LENGTH = 2_000;
const MAX_STACK_LENGTH = 2_000;

function isValidErrorStatus(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_ERROR_STATUS && value <= MAX_ERROR_STATUS;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly retryAfterSeconds?: number;

  constructor(message: string, statusCode: number = 400, isOperational: boolean = true, retryAfterSeconds?: number) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, new.target.prototype);
    this.statusCode = isValidErrorStatus(statusCode) ? statusCode : 500;
    this.isOperational = isOperational;
    this.retryAfterSeconds =
      statusCode === 429 && typeof retryAfterSeconds === "number" && Number.isSafeInteger(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds
        : undefined;

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

function safelyStringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  if (typeof value === "symbol") return value.description || "Symbol";
  if (value == null) return "Unknown error";

  try {
    return String(value);
  } catch {
    return "Unprintable error";
  }
}

function readProperty(value: unknown, property: string): unknown {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return undefined;

  try {
    return (value as Record<string, unknown>)[property];
  } catch {
    return undefined;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  const message = readProperty(error, "message");
  return typeof message === "string" ? message : safelyStringify(error);
}

function redactSensitiveData(value: string): string {
  return value
    .replace(/([a-z][a-z0-9+.-]*:\/\/[^\s:/]+:)[^@\s]+@/gi, "$1[REDACTED]@")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+\b/gi, "Bearer [REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[REDACTED_JWT]")
    .replace(/\b(password|passwd|secret|token|api[_-]?key|authorization)\s*[:=]\s*([^\s,;]+)/gi, "$1=[REDACTED]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/(?:\+?62|0)8[1-9][0-9\s-]{6,16}\b/g, "[REDACTED_PHONE]");
}

function sanitizeText(value: string, maxLength: number): string {
  return redactSensitiveData(value).replace(/[\u0000-\u001F\u007F]/g, " ").slice(0, maxLength).trim();
}

function getSanitizedStack(error: unknown): string | undefined {
  if (!(error instanceof Error) || !error.stack) return undefined;
  const stack = redactSensitiveData(error.stack)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .slice(0, MAX_STACK_LENGTH)
    .trim();
  return stack || undefined;
}

function isSafeOperationalError(error: unknown): error is AppError {
  return (
    error instanceof AppError &&
    error.isOperational === true &&
    isValidErrorStatus(error.statusCode) &&
    error.statusCode < 500
  );
}

function getStatusCode(error: unknown): number {
  if (!isSafeOperationalError(error)) return 500;
  return isValidErrorStatus(error.statusCode) ? error.statusCode : 500;
}

function getLogCode(error: unknown): string | number | undefined {
  const code = readProperty(error, "code");
  if (typeof code === "number" && Number.isFinite(code)) return code;
  if (typeof code === "string") return sanitizeText(code, 100) || undefined;
  return undefined;
}

export async function handleError(error: unknown): Promise<Response> {
  const requestId = crypto.randomUUID();
  const status = getStatusCode(error);
  const isOperational = isSafeOperationalError(error);
  const rawMessage = getErrorMessage(error);
  const logMessage = sanitizeText(rawMessage, MAX_LOG_VALUE_LENGTH) || "Unknown error";
  const clientMessage = isOperational
    ? sanitizeText(rawMessage, MAX_CLIENT_MESSAGE_LENGTH) || DEFAULT_CLIENT_MESSAGE
    : DEFAULT_CLIENT_MESSAGE;

  const logPayload: Record<string, string | number> = {
    requestId,
    status,
    errorType: error instanceof Error ? error.name || "Error" : typeof error,
    message: logMessage,
  };
  const code = getLogCode(error);
  if (code !== undefined) logPayload.code = code;

  // Logger (Pino) otomatis menyanitasi password/token/PII sebelum dicatat.
  if (status >= 500) {
    log.error(logPayload, "Unhandled API error");
    const stack = getSanitizedStack(error);
    after(async () => {
      await notifyTelegramServerError({
        requestId,
        status,
        errorType: String(logPayload.errorType),
        message: logMessage,
        code,
        stack,
        occurredAt: new Date().toISOString(),
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
      });
    });
  } else {
    log.warn(logPayload, "Operational API warning");
  }

  const retryAfterSeconds = error instanceof AppError ? error.retryAfterSeconds : undefined;
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": requestId,
  };
  if (status === 429) headers["Retry-After"] = String(retryAfterSeconds || 60);

  return Response.json(
    { success: false, error: clientMessage, requestId },
    {
      status,
      headers,
    }
  );
}
