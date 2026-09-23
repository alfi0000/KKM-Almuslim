import { NextResponse } from "next/server";
import { setStudentKetuaKelompokStatus, getProfileByNpm, getDplNamaFromSession, hasOtherKetuaKelompok, isStudentUnderDpl } from "@/lib/db";
import { AppError, handleError } from "@/lib/error";
import { readJsonObject, requiredBoolean, requiredString } from "@/lib/api-validation";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 32_768);
    const { npm, isKetua } = body;
    const cleanNpm = requiredString(npm, "NPM", 5, 20);
    if (!/^\d{5,20}$/.test(cleanNpm)) throw new AppError("Format NPM tidak valid.", 400);
    const targetStatus = requiredBoolean(isKetua, "isKetua") ? 1 : 0;

    const dplNama = await getDplNamaFromSession();
    if (!dplNama) {
      throw new AppError("Tidak terautentikasi.", 401);
    }

    if (!(await isStudentUnderDpl(cleanNpm, dplNama))) {
      throw new AppError("Anda tidak berwenang mengubah status mahasiswa di luar bimbingan Anda.", 403);
    }

    if (targetStatus === 1) {
      const targetProfile = await getProfileByNpm(cleanNpm);
      if (!targetProfile?.gampong || targetProfile.gampong === "Belum Ditentukan") {
        throw new AppError("Mahasiswa harus sudah ditempatkan pada gampong sebelum ditetapkan sebagai Ketua Kelompok.", 400);
      }
      if (await hasOtherKetuaKelompok(targetProfile.gampong, cleanNpm)) {
        throw new AppError("Gampong ini sudah memiliki Ketua Kelompok. Batalkan penetapan ketua sebelumnya terlebih dahulu.", 409);
      }
    }

    await setStudentKetuaKelompokStatus(cleanNpm, targetStatus);

    // Get the updated profile
    const updatedProfile = await getProfileByNpm(cleanNpm);

    return NextResponse.json({
      success: true,
      message: `Status ketua kelompok berhasil diperbarui untuk NPM ${cleanNpm}.`,
      profile: updatedProfile,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
