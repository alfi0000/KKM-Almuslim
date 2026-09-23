import { NextResponse } from "next/server";
import { updateLaporanStatus, getDplNamaFromSession, isLaporanUnderDpl } from "@/lib/db";
import { AppError, handleError } from "@/lib/error";
import { oneOf, optionalString, positiveInteger, readJsonObject } from "@/lib/api-validation";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 32_768);
    const { id, status, catatanDpl } = body;
    const cleanId = positiveInteger(id, "ID");
    const cleanStatus = oneOf(status, "Status", ["Disetujui DPL", "Perlu Revisi"] as const);
    const cleanNote = optionalString(catatanDpl, "Catatan DPL", 2_000) || "";

    const dplNama = await getDplNamaFromSession();
    if (!dplNama) {
      throw new AppError("Tidak terautentikasi.", 401);
    }

    if (!(await isLaporanUnderDpl(cleanId, dplNama))) {
      throw new AppError("Anda tidak berwenang memverifikasi laporan mahasiswa di luar bimbingan Anda.", 403);
    }

    await updateLaporanStatus(cleanId, cleanStatus, cleanNote);

    return NextResponse.json({
      success: true,
      message: "Status berkas laporan berhasil diperbarui.",
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
