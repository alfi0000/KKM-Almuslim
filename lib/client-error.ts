/**
 * Helper klien untuk mengambil pesan aman dari error yang tidak diketahui tipenya.
 */
export function getErrorMessage(err: unknown, fallback = "Terjadi kesalahan. Silakan coba lagi."): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}
