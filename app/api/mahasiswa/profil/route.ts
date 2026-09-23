import { NextResponse } from "next/server";
import { updateStudentProfileDetails, getProfileByNpm, getProfileEditEnabled } from "@/lib/db";
import { handleError } from "@/lib/error";
import { requireStudent } from "@/lib/authorization";
import { optionalTrustedUploadUrl } from "@/lib/validation";
import { oneOf, optionalString, readJsonObject, requiredString } from "@/lib/api-validation";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 64_000);
    const {
      npm,
      nama,
      foto,
      golonganDarah,
      riwayatPenyakit,
      noHpMahasiswa,
      noHpOrtu,
      alamat,
    } = body;
    const session = await requireStudent(npm);

    const cleanName = requiredString(nama, "Nama", 2, 120);

    const updatedProfile = await updateStudentProfileDetails(
      session.npm,
      cleanName,
      optionalTrustedUploadUrl(foto, "URL foto"),
      golonganDarah ? oneOf(golonganDarah, "Golongan darah", ["A", "B", "AB", "O", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const) : undefined,
      optionalString(riwayatPenyakit, "Riwayat penyakit", 1_000),
      optionalString(noHpMahasiswa, "Nomor HP mahasiswa", 30),
      optionalString(noHpOrtu, "Nomor HP orang tua", 30),
      optionalString(alamat, "Alamat", 1_000)
    );

    return NextResponse.json({
      success: true,
      message: "Profil mahasiswa berhasil diperbarui di database.",
      profile: updatedProfile,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const npm = searchParams.get("npm");
    const session = await requireStudent(npm || undefined);

    const [profile, editEnabled] = await Promise.all([
      getProfileByNpm(session.npm),
      getProfileEditEnabled(),
    ]);
    return NextResponse.json({
      success: true,
      profile: profile || null,
      editEnabled,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
