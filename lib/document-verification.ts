import { AppError } from "./error";

const REQUIRED_DOCUMENT_KEYS = ["slipPembayaran", "slipSpp", "transkrip", "krs", "pasFoto", "asuransiJiwa"] as const;

export function areAllRequiredDocumentsVerified(note?: string): boolean {
  if (!note) return false;
  try {
    const parsed = JSON.parse(note);
    return REQUIRED_DOCUMENT_KEYS.every((key) => parsed?.perBerkas?.[key]?.status === "ok");
  } catch {
    return false;
  }
}

export function requireVerifiedDocuments(note?: string) {
  if (!areAllRequiredDocumentsVerified(note)) {
    throw new AppError("Fitur ini tersedia setelah seluruh berkas persyaratan diverifikasi admin.", 403);
  }
}
