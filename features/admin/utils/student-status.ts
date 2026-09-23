interface StudentVerificationProfile {
  status?: string;
  catatanVerifikasiBerkas?: string;
}

interface DocumentReview {
  status?: unknown;
}

export function normalizeStudentStatus(status?: string): string {
  return String(status || "").trim().toLowerCase();
}

export function isDocumentVerified(status?: string): boolean {
  return ["terverifikasi", "terverifikasi / aktif"].includes(normalizeStudentStatus(status));
}

export function isDocumentRejected(status?: string): boolean {
  return ["tidak terverifikasi", "perlu perbaikan"].includes(normalizeStudentStatus(status));
}

export function hasPerBerkasIssue(profile?: StudentVerificationProfile | null): boolean {
  if (!profile?.catatanVerifikasiBerkas) return false;

  try {
    const parsed = JSON.parse(profile.catatanVerifikasiBerkas) as { perBerkas?: unknown };
    if (!parsed.perBerkas || typeof parsed.perBerkas !== "object") return false;
    return Object.values(parsed.perBerkas as Record<string, DocumentReview>).some(
      (review) => review?.status === "x"
    );
  } catch {
    return false;
  }
}

export function needsRepair(profile?: StudentVerificationProfile | null): boolean {
  return isDocumentRejected(profile?.status) || hasPerBerkasIssue(profile);
}
