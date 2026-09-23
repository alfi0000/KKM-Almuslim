import { NextResponse } from "next/server";
import { getProfileByNpm, getAnggotaByGampong } from "@/lib/db";
import { handleError } from "@/lib/error";
import { requireStudent } from "@/lib/authorization";
import { requireVerifiedDocuments } from "@/lib/document-verification";

export async function GET() {
  try {
    const session = await requireStudent();
    const profile = await getProfileByNpm(session.npm);
    requireVerifiedDocuments(profile?.catatanVerifikasiBerkas);

    if (!profile?.gampong) {
      return NextResponse.json({
        success: true,
        gampong: null,
        anggota: [],
        message: "Gampong belum ditentukan.",
      });
    }

    // Ketua melihat seluruh anggota; anggota juga saling melihat satu sama lain.
    // Hanya yang satu gampong + satu semester KKM yang sama, jangan dicampur.
    const anggota = await getAnggotaByGampong(profile.gampong, session.npm, profile.kkmSemester);

    return NextResponse.json({
      success: true,
      gampong: profile.gampong,
      kkmSemester: profile.kkmSemester || null,
      isKetua: Number(profile.isKetuaKelompok) === 1,
      anggota,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
