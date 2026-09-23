export const REQUIRED_DOCUMENT_KEYS = [
  "slipPembayaran",
  "slipSpp",
  "transkrip",
  "krs",
  "pasFoto",
  "asuransiJiwa",
] as const;

export const DOCUMENT_LABELS: Record<string, string> = {
  slipPembayaran: "Slip Pembayaran",
  slipSpp: "Slip SPP",
  transkrip: "Transkrip Nilai",
  krs: "KRS",
  pasFoto: "Pas Photo 3x4",
  asuransiJiwa: "Asuransi Jiwa",
};

export interface DocumentReview {
  status: "ok" | "x" | "pending";
  note?: string;
}

export type DocumentReviews = Record<string, DocumentReview>;

export function parseDocumentReviews(note?: string): DocumentReviews | null {
  if (!note) return null;

  try {
    const parsed = JSON.parse(note) as { perBerkas?: unknown };
    return parsed.perBerkas && typeof parsed.perBerkas === "object"
      ? (parsed.perBerkas as DocumentReviews)
      : null;
  } catch {
    return null;
  }
}

export function areAllDocumentsVerified(reviews: DocumentReviews | null): boolean {
  return REQUIRED_DOCUMENT_KEYS.every((key) => reviews?.[key]?.status === "ok");
}

export function getDocumentRepairList(reviews: DocumentReviews | null) {
  return Object.entries(reviews || {})
    .filter(([, review]) => review?.status === "x")
    .map(([key, review]) => ({
      key,
      label: DOCUMENT_LABELS[key] || key,
      note: review?.note || "",
    }));
}

export function hasPendingDocumentReview(reviews: DocumentReviews | null): boolean {
  return Object.values(reviews || {}).some((review) => review?.status === "pending");
}

export function isDocumentSubmissionRejected(status?: string): boolean {
  const normalized = String(status || "").trim().toLowerCase();
  return ["tidak terverifikasi", "perlu perbaikan"].includes(normalized);
}
