import { NextResponse } from "next/server";
import { getProfileByNpm } from "@/lib/db";
import { AppError, handleError } from "@/lib/error";

export async function GET(_: Request, context: { params: Promise<{ npm: string }> }) {
  try {
    const { npm } = await context.params;
    if (!/^\d{5,20}$/.test(npm)) {
      return NextResponse.json({ success: false, profile: null }, { status: 400 });
    }
    const profile = await getProfileByNpm(npm);
    if (!profile) throw new AppError("Data peserta tidak ditemukan.", 404);
    const normalizedStatus = String(profile.status || "").trim().toLowerCase();
    if (!["terverifikasi", "terverifikasi / aktif"].includes(normalizedStatus)) {
      throw new AppError("Berkas peserta belum disetujui admin.", 403);
    }
    const { nama, fakultas, prodi, program, kecamatan, gampong, dpl, posko, tanggalDaftar, status, angkatan, lokasi, foto, isKetuaKelompok } = profile;
    return NextResponse.json({
      success: true,
      profile: { nama, npm, fakultas, prodi, program, kecamatan, gampong, dpl, posko, tanggalDaftar, status, angkatan, lokasi, foto, isKetuaKelompok },
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error: unknown) {
    return handleError(error);
  }
}
