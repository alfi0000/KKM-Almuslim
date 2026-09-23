import { NextResponse } from "next/server";
import { AppError, handleError } from "@/lib/error";
import { requireStudent } from "@/lib/authorization";
import { getBerkasUploadEnabled, getProfileByNpm, saveMahasiswaBerkas, setStudentVerificationStatus } from "@/lib/db";
import { readJsonObject } from "@/lib/api-validation";
import { optionalTrustedUploadUrl } from "@/lib/validation";

const documentKeys = ["slipPembayaran", "slipSpp", "transkrip", "krs", "pasFoto", "asuransiJiwa"] as const;
type DocumentKey = (typeof documentKeys)[number];
type DocumentReview = { status: "ok" | "x" | "pending"; note?: string };

function parseDocumentReviews(value?: string): Record<string, DocumentReview> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && parsed.perBerkas && typeof parsed.perBerkas === "object") {
      return parsed.perBerkas as Record<string, DocumentReview>;
    }
  } catch {}
  return {};
}

function profileDocumentUrls(profile: Awaited<ReturnType<typeof getProfileByNpm>>) {
  return {
    slipPembayaran: profile?.slipPembayaran || profile?.buktiPembayaran || undefined,
    slipSpp: profile?.slipSpp || undefined,
    transkrip: profile?.transkrip || undefined,
    krs: profile?.krs || undefined,
    pasFoto: profile?.foto || undefined,
    asuransiJiwa: profile?.asuransiJiwa || undefined,
  } satisfies Record<DocumentKey, string | undefined>;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const npm = searchParams.get("npm");
    const session = await requireStudent(npm || undefined);
    const profile = await getProfileByNpm(session.npm);
    const uploadEnabled = await getBerkasUploadEnabled();
    // Upload hanya dikontrol toggle global admin + status per-berkas.
    // Tanpa gate verifikasi level mahasiswa.
    const reviews = parseDocumentReviews(profile?.catatanVerifikasiBerkas);
    const hasEditableDocument = documentKeys.some((key) => !reviews[key] || reviews[key].status === "x");
    const canUpload = uploadEnabled && hasEditableDocument;
    return NextResponse.json({
      success: true,
      canUpload,
      uploadEnabled,
      berkas: {
        slipPembayaran: profile?.slipPembayaran || profile?.buktiPembayaran || null,
        slipSpp: profile?.slipSpp || null,
        transkrip: profile?.transkrip || null,
        krs: profile?.krs || null,
        pasFoto: profile?.foto || null,
        asuransiJiwa: profile?.asuransiJiwa || null,
      },
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 64_000);
    const { npm, slipPembayaran, slipSpp, transkrip, krs, pasFoto, asuransiJiwa } = body as Record<string, unknown>;
    const session = await requireStudent(npm as string | undefined);
    const [profile, uploadEnabled] = await Promise.all([
      getProfileByNpm(session.npm),
      getBerkasUploadEnabled(),
    ]);
    if (!profile) {
      throw new AppError("Isi biodata pendaftaran terlebih dahulu sebelum mengunggah berkas.", 403);
    }
    const currentReviews = parseDocumentReviews(profile?.catatanVerifikasiBerkas);
    const normalizedStatus = String(profile?.status || "").trim().toLowerCase();
    // Siklus perbaikan: sebelumnya ada berkas salah (status Perlu Perbaikan / ada 'x').
    // Setelah mahasiswa mengirim perbaikan, status harus TETAP "Perlu Perbaikan"
    // agar tetap masuk filter perbaikan di admin sampai admin memeriksa ulang.
    const wasRepairCycle =
      normalizedStatus === "perlu perbaikan" ||
      documentKeys.some((key) => currentReviews[key]?.status === "x");
    if (!uploadEnabled) {
      throw new AppError("Upload berkas belum dibuka oleh admin.", 403);
    }

    const cleanSlipPembayaran = optionalTrustedUploadUrl(slipPembayaran, "Slip pembayaran");
    const cleanSlipSpp = optionalTrustedUploadUrl(slipSpp, "Slip SPP");
    const cleanTranskrip = optionalTrustedUploadUrl(transkrip, "Transkrip");
    const cleanKrs = optionalTrustedUploadUrl(krs, "KRS");
    const cleanPasFoto = optionalTrustedUploadUrl(pasFoto, "Pas foto");
    const cleanAsuransi = optionalTrustedUploadUrl(asuransiJiwa, "Asuransi jiwa");

    const submittedUrls: Record<DocumentKey, string | undefined> = {
      slipPembayaran: cleanSlipPembayaran,
      slipSpp: cleanSlipSpp,
      transkrip: cleanTranskrip,
      krs: cleanKrs,
      pasFoto: cleanPasFoto,
      asuransiJiwa: cleanAsuransi,
    };
    const currentUrls = profileDocumentUrls(profile);
    const hasEditableDocument = documentKeys.some((key) => !currentReviews[key] || currentReviews[key].status === "x");
    if (!hasEditableDocument) {
      throw new AppError("Tidak ada berkas yang dapat diganti.", 409);
    }

    for (const key of documentKeys) {
      const reviewStatus = currentReviews[key]?.status;
      if (["ok", "pending"].includes(reviewStatus || "") && submittedUrls[key] !== currentUrls[key]) {
        throw new AppError("Berkas yang sudah sesuai atau sedang diperiksa tidak dapat diganti.", 409);
      }
    }

    // Require all? The spec lists 6 berkas as required for dashboard upload
    // We allow partial saves, but frontend will require all before submit
    const updated = await saveMahasiswaBerkas(session.npm, {
      slipPembayaran: cleanSlipPembayaran,
      slipSpp: cleanSlipSpp,
      transkrip: cleanTranskrip,
      krs: cleanKrs,
      pasFoto: cleanPasFoto,
      asuransiJiwa: cleanAsuransi,
    });

    const nextReviews: Record<string, DocumentReview> = {};
    for (const key of documentKeys) {
      const currentReview = currentReviews[key];
      const changed = submittedUrls[key] !== currentUrls[key];
      if (currentReview?.status === "ok" || currentReview?.status === "pending") {
        nextReviews[key] = currentReview;
      } else if (currentReview?.status === "x" && !changed) {
        nextReviews[key] = currentReview;
      } else if (submittedUrls[key]) {
        nextReviews[key] = { status: "pending" };
      }
    }
    const stillNeedsRepair = documentKeys.some((key) => nextReviews[key]?.status === "x");
    const reviewPayload = JSON.stringify({ perBerkas: nextReviews, submittedAt: new Date().toISOString() });
    await setStudentVerificationStatus(
      session.npm,
      stillNeedsRepair || wasRepairCycle ? "Perlu Perbaikan" : "Menunggu Pemeriksaan Berkas",
      reviewPayload,
      false
    );

    return NextResponse.json({ success: true, message: "Berkas berhasil disimpan dan menunggu pemeriksaan admin.", berkas: updated });
  } catch (error: unknown) {
    return handleError(error);
  }
}
