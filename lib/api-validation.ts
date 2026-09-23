import { AppError } from "./error";

export async function readJsonValue(request: Request, maxBytes = 1_000_000): Promise<unknown> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) throw new AppError("Content-Type harus application/json.", 415);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new AppError("Payload terlalu besar.", 413);
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new AppError("JSON tidak valid.", 400); }
  return value;
}

export async function readJsonObject(request: Request, maxBytes = 1_000_000): Promise<Record<string, unknown>> {
  const value = await readJsonValue(request, maxBytes);
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new AppError("Payload harus berupa object JSON.", 400);
  return value as Record<string, unknown>;
}

export function requiredString(value: unknown, field: string, min = 1, max = 255): string {
  if (typeof value !== "string") throw new AppError(`${field} harus berupa teks.`, 400);
  const result = value.trim();
  if (result.length < min || result.length > max) throw new AppError(`${field} harus ${min}–${max} karakter.`, 400);
  return result;
}

export function optionalString(value: unknown, field: string, max = 255): string | undefined {
  if (value == null || value === "") return undefined;
  return requiredString(value, field, 1, max);
}

export function positiveInteger(value: unknown, field: string): number {
  const result = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(result) || result <= 0) throw new AppError(`${field} tidak valid.`, 400);
  return result;
}

export function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new AppError(`${field} harus berupa boolean.`, 400);
  return value;
}

export function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  const result = requiredString(value, field, 1, 100);
  const match = allowed.find((a) => a.toLowerCase() === result.toLowerCase());
  if (!match) throw new AppError(`${field} tidak valid.`, 400);
  return match;
}
