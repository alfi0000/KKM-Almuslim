import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/authorization";
import { getAllStudentProfiles, getProfileByNpm } from "@/lib/db";
import { AppError, handleError } from "@/lib/error";
import { generateVerifiedStudentDocx, generateVerifiedStudentPdf } from "@/lib/verified-student-documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const requiredDocumentKeys = ["slipPembayaran", "slipSpp", "transkrip", "krs", "pasFoto", "asuransiJiwa"];

function areAllDocumentsVerified(note?: string) {
  if (!note) return false;
  try {
    const parsed = JSON.parse(note);
    return requiredDocumentKeys.every((key) => parsed?.perBerkas?.[key]?.status === "ok");
  } catch {
    return false;
  }
}

async function loadPhotoAsPng(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") {
    throw new AppError("Alamat pas foto tidak valid.", 400);
  }
  const pngUrl = url.includes("/image/upload/") ? url.replace("/image/upload/", "/image/upload/f_png/") : url;
  const response = await fetch(pngUrl, { cache: "no-store" });
  if (!response.ok) throw new AppError("Pas foto mahasiswa tidak dapat dimuat.", 502);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) throw new AppError("Ukuran pas foto tidak valid.", 400);
  return bytes;
}

export async function GET(request: Request) {
  try {
    const session = await requireStudent();
    const profile = await getProfileByNpm(session.npm);
    if (!profile) throw new AppError("Profil mahasiswa tidak ditemukan.", 404);
    if (!areAllDocumentsVerified(profile.catatanVerifikasiBerkas)) throw new AppError("Dokumen tersedia setelah seluruh berkas disetujui admin.", 403);
    if (!profile.foto) throw new AppError("Pas foto mahasiswa belum tersedia.", 400);

    const format = new URL(request.url).searchParams.get("format")?.toLowerCase();
    if (format !== "pdf" && format !== "docx") throw new AppError("Format dokumen harus PDF atau DOCX.", 400);
    const photoBytes = await loadPhotoAsPng(profile.foto);
    const safeNpm = profile.npm.replace(/[^0-9A-Za-z_-]/g, "");
    // Hitung nomor urut verifikasi XXX001 berdasarkan updatedAt (siapa diverifikasi duluan)
    const allProfiles = await getAllStudentProfiles();
    const verifiedSorted = allProfiles.filter(p => areAllDocumentsVerified(p.catatanVerifikasiBerkas)).sort((a,b) => {
      const aTime = (a as any).updatedAt ? new Date((a as any).updatedAt).getTime() : (a.id || 0);
      const bTime = (b as any).updatedAt ? new Date((b as any).updatedAt).getTime() : (b.id || 0);
      if (aTime !== bTime) return aTime - bTime;
      return (a.id || 0) - (b.id || 0);
    });
    const verifiedIndex = verifiedSorted.findIndex(v => v.npm === profile.npm) + 1;
    const nomorMahasiswa = `${profile.angkatan || "XXX"}${String(verifiedIndex || 1).padStart(3, "0")}`;

    if (format === "pdf") {
      const bytes = await generateVerifiedStudentPdf(profile, photoBytes, nomorMahasiswa);
      return new NextResponse(Buffer.from(bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Dokumen-KKM-${nomorMahasiswa}-${safeNpm}.pdf"`,
          "Cache-Control": "no-store, private",
        },
      });
    }

    const bytes = await generateVerifiedStudentDocx(profile, photoBytes, nomorMahasiswa);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Dokumen-KKM-${nomorMahasiswa}-${safeNpm}.docx"`,
        "Cache-Control": "no-store, private",
      },
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
