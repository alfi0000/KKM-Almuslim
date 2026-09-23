import { NextResponse } from "next/server";
import { getLogbooksByNpm, addLogbook, updateLogbook, getLogbookCategoryForStudent, getProfileByNpm, getKelompokLogbooksByGampong, getActiveLogbookWeek } from "@/lib/db";
import { AppError, handleError } from "@/lib/error";
import { requireStudent } from "@/lib/authorization";
import { requireVerifiedDocuments } from "@/lib/document-verification";
import { assertTrustedUploadUrl, optionalTrustedUploadUrl } from "@/lib/validation";
import { oneOf, optionalString, positiveInteger, readJsonObject, requiredString } from "@/lib/api-validation";

async function assertGroupLogbookPermission(npm: string) {
  const profile = await getProfileByNpm(npm);
  if (!profile?.gampong || profile.gampong === "Belum Ditentukan" || Number(profile.isKetuaKelompok) !== 1) {
    throw new AppError("Hanya Ketua Kelompok gampong yang dapat membuat atau mengubah logbook kelompok.", 403);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedNpm = searchParams.get("npm");
    const session = await requireStudent(requestedNpm || undefined);
    const npm = session.npm;

    const [logbooks, profile, activeWeek] = await Promise.all([
      getLogbooksByNpm(npm),
      getProfileByNpm(npm),
      getActiveLogbookWeek(),
    ]);
    requireVerifiedDocuments(profile?.catatanVerifikasiBerkas);

    // Logbook Kelompok dari anggota satu gampong (diunggah ketua) ikut tampil.
    const groupLogbooks = profile?.gampong
      ? await getKelompokLogbooksByGampong(profile.gampong, npm)
      : [];

    return NextResponse.json({
      success: true,
      logbooks,
      groupLogbooks,
      activeWeek,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 64_000);
    const { npm, tanggal, judul, lokasi, deskripsi, capaianAkhir, foto, foto2, kategori, minggu } = body;
    const session = await requireStudent(npm);
    const [profile, activeWeek] = await Promise.all([getProfileByNpm(session.npm), getActiveLogbookWeek()]);
    requireVerifiedDocuments(profile?.catatanVerifikasiBerkas);
    if (!activeWeek) throw new AppError("Logbook sedang ditutup oleh admin.", 403);
    let targetWeek = activeWeek;
    if (minggu !== undefined && minggu !== null && minggu !== "") {
      const parsed = Number(minggu);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3) {
        throw new AppError("Minggu logbook harus 1, 2, atau 3.", 400);
      }
      if (parsed !== activeWeek) {
        throw new AppError(`Upload logbook hanya dibuka untuk Minggu ${activeWeek} oleh admin.`, 403);
      }
      targetWeek = parsed;
    }
    const cleanTitle = requiredString(judul, "Judul", 3, 200);
    const cleanDescription = requiredString(deskripsi, "Deskripsi", 10, 5_000);
    const cleanCapaianAkhir = requiredString(capaianAkhir, "Capaian akhir", 10, 5_000);
    const cleanDate = optionalString(tanggal, "Tanggal", 20) || new Date().toISOString().split("T")[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) throw new AppError("Format tanggal harus YYYY-MM-DD.", 400);
    const cleanCategory = kategori ? oneOf(kategori, "Kategori", ["Mandiri", "Kelompok"] as const) : "Mandiri";
    if (cleanCategory === "Kelompok") await assertGroupLogbookPermission(session.npm);

    const newLogbook = await addLogbook({
      npm: session.npm,
      tanggal: cleanDate,
      judul: cleanTitle,
      lokasi: optionalString(lokasi, "Lokasi", 200) || "Posko KKM",
      deskripsi: cleanDescription,
      foto: assertTrustedUploadUrl(foto, "Foto dokumentasi 1"),
      foto2: assertTrustedUploadUrl(foto2, "Foto dokumentasi 2"),
      capaianAkhir: cleanCapaianAkhir,
      status: "Dalam Tinjauan",
      kategori: cleanCategory,
      minggu: targetWeek,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Logbook digital berhasil disimpan ke backend.",
        logbook: newLogbook,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await readJsonObject(request, 64_000);
    const { id, tanggal, judul, lokasi, deskripsi, capaianAkhir, foto, foto2, kategori } = body;
    const session = await requireStudent();
    const profile = await getProfileByNpm(session.npm);
    requireVerifiedDocuments(profile?.catatanVerifikasiBerkas);
    // Revisi tidak menambah entri minggu baru, jadi tetap diizinkan
    // walaupun admin sedang menutup upload logbook.

    const cleanId = positiveInteger(id, "ID Logbook");
    const cleanCategory = kategori ? oneOf(kategori, "Kategori", ["Mandiri", "Kelompok"] as const) : undefined;
    const effectiveCategory = cleanCategory || await getLogbookCategoryForStudent(cleanId, session.npm);
    if (effectiveCategory === "Kelompok") await assertGroupLogbookPermission(session.npm);

    await updateLogbook(cleanId, session.npm, {
      tanggal: optionalString(tanggal, "Tanggal", 20),
      judul: optionalString(judul, "Judul", 200),
      lokasi: optionalString(lokasi, "Lokasi", 200),
      deskripsi: optionalString(deskripsi, "Deskripsi", 5_000),
      capaianAkhir: optionalString(capaianAkhir, "Capaian akhir", 5_000),
      foto: optionalTrustedUploadUrl(foto, "URL foto"),
      foto2: optionalTrustedUploadUrl(foto2, "URL foto kedua"),
      kategori: cleanCategory,
      status: "Dalam Tinjauan",
      catatanDpl: "",
    });

    return NextResponse.json({
      success: true,
      message: "Logbook digital berhasil diperbarui untuk revisi.",
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
