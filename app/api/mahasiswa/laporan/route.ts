import { NextResponse } from "next/server";
import { getLaporansByNpm, addLaporan, updateLaporan, getProfileByNpm, getGroupLaporansByGampong, GROUP_REPORT_TYPES } from "@/lib/db";
import { AppError, handleError } from "@/lib/error";
import { requireStudent } from "@/lib/authorization";
import { requireVerifiedDocuments } from "@/lib/document-verification";
import { assertTrustedUploadUrl } from "@/lib/validation";
import { oneOf, optionalString, positiveInteger, readJsonObject } from "@/lib/api-validation";

const REPORT_TYPES = ["Laporan Mingguan Minggu 1", "Laporan Mingguan Minggu 2", "Laporan Mingguan Minggu 3", "Laporan Akhir KKM"] as const;

async function assertGroupReportPermission(npm: string, jenis?: string) {
  if (!jenis || !GROUP_REPORT_TYPES.includes(jenis)) return;
  const profile = await getProfileByNpm(npm);
  if (!profile || Number(profile.isKetuaKelompok) !== 1) {
    throw new AppError("Hanya Ketua Kelompok gampong yang dapat mengunggah dokumen kelompok.", 403);
  }
}

function validFileSize(value: unknown): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result <= 0 || result > 10 * 1024 * 1024) throw new AppError("Ukuran file tidak valid.", 400);
  return result;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedNpm = searchParams.get("npm");
    const session = await requireStudent(requestedNpm || undefined);
    const npm = session.npm;

    const [laporans, profile] = await Promise.all([
      getLaporansByNpm(npm),
      getProfileByNpm(npm),
    ]);
    requireVerifiedDocuments(profile?.catatanVerifikasiBerkas);

    // Laporan kelompok yang diunggah ketua tampil untuk semua anggota gampong.
    const groupLaporans = profile?.gampong
      ? await getGroupLaporansByGampong(profile.gampong, npm)
      : [];

    return NextResponse.json({
      success: true,
      laporans,
      groupLaporans,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 32_768);
    const { npm, jenis, namaFile, fileUrl, fileType, fileSize } = body;
    const session = await requireStudent(npm);
    const profile = await getProfileByNpm(session.npm);
    requireVerifiedDocuments(profile?.catatanVerifikasiBerkas);

    const cleanType = oneOf(jenis, "Jenis laporan", REPORT_TYPES);
    await assertGroupReportPermission(session.npm, cleanType);
    const cleanFileSize = validFileSize(fileSize);

    const tanggalUpload = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const newLaporan = await addLaporan({
      npm: session.npm,
      jenis: cleanType,
      namaFile: optionalString(namaFile, "Nama file", 255) || "Berkas_Laporan.pdf",
      fileUrl: assertTrustedUploadUrl(fileUrl),
      fileType: optionalString(fileType, "Tipe file", 150) || "application/pdf",
      fileSize: cleanFileSize,
      tanggalUpload,
      status: "Dalam Tinjauan",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Berkas laporan berhasil disimpan ke backend.",
        laporan: newLaporan,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await readJsonObject(request, 32_768);
    const { id, jenis, namaFile, fileUrl, fileType, fileSize } = body;
    const session = await requireStudent();
    const profile = await getProfileByNpm(session.npm);
    requireVerifiedDocuments(profile?.catatanVerifikasiBerkas);

    const cleanId = positiveInteger(id, "ID Laporan");

    const tanggalUpload = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const cleanJenis = jenis ? oneOf(jenis, "Jenis laporan", REPORT_TYPES) : undefined;
    if (cleanJenis) await assertGroupReportPermission(session.npm, cleanJenis);

    await updateLaporan(cleanId, session.npm, {
      jenis: cleanJenis,
      namaFile: optionalString(namaFile, "Nama file", 255),
      fileUrl: fileUrl ? assertTrustedUploadUrl(fileUrl) : undefined,
      fileType: optionalString(fileType, "Tipe file", 150),
      fileSize: fileSize ? validFileSize(fileSize) : undefined,
      tanggalUpload,
      status: "Dalam Tinjauan",
      catatanDpl: "",
    });

    return NextResponse.json({
      success: true,
      message: "Berkas laporan berhasil diperbarui untuk revisi.",
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
