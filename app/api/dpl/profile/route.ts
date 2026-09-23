import { NextResponse } from "next/server";
import { findDplByNidn, updateDplProfile } from "@/lib/db";
import { AppError, handleError } from "@/lib/error";
import { requireDpl } from "@/lib/authorization";
import { optionalTrustedUploadUrl } from "@/lib/validation";
import { oneOf, optionalString, readJsonObject, requiredString } from "@/lib/api-validation";

const DPL_SCHEMES = ["KKM Reguler", "KKM Non-Reguler", "KKM Internasional"] as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedNidn = searchParams.get("nidn");
    const session = await requireDpl(requestedNidn || undefined);
    const nidn = session.nidn;

    const dpl = await findDplByNidn(String(nidn));
    if (!dpl) {
      throw new AppError("DPL tidak ditemukan.", 404);
    }

    const safeProfile = { ...dpl };
    delete safeProfile.password;
    return NextResponse.json({ success: true, profile: safeProfile });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 64_000);
    const {
      nidn,
      nama,
      fakultas,
      skema,
      kecamatan,
      email,
      noHp,
      alamat,
      foto,
    } = body;

    const session = await requireDpl(nidn);

    const cleanName = requiredString(nama, "Nama", 2, 120);
    const cleanFaculty = requiredString(fakultas, "Fakultas", 2, 120);
    const cleanScheme = oneOf(skema, "Skema", DPL_SCHEMES);
    const updatedProfile = await updateDplProfile({
      nidn: session.nidn,
      nama: cleanName,
      fakultas: cleanFaculty,
      skema: cleanScheme,
      kecamatan: optionalString(kecamatan, "Kecamatan", 120),
      email: optionalString(email, "Email", 254),
      noHp: optionalString(noHp, "Nomor HP", 30),
      alamat: optionalString(alamat, "Alamat", 1_000),
      foto: optionalTrustedUploadUrl(foto, "URL foto"),
    });

    const safeProfile = { ...updatedProfile };
    delete safeProfile.password;
    return NextResponse.json({ success: true, message: "Profil DPL berhasil diperbarui.", profile: safeProfile });
  } catch (error: unknown) {
    return handleError(error);
  }
}
