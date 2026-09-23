/**
 * Helper tipe-aman untuk memetakan baris hasil query MySQL (snake_case)
 * menjadi bentuk camelCase yang dipakai aplikasi, tanpa `any`.
 */
export type DbRow = Record<string, unknown>;

export function isoDateTime(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || !value.trim()) return undefined;

  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
