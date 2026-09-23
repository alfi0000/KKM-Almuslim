import { NextResponse } from "next/server";
import { findDplByNidn } from "@/lib/db";
import { createSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { AppError, handleError } from "@/lib/error";
import { readJsonObject, requiredString } from "@/lib/api-validation";

const DUMMY_PASSWORD_HASH = bcrypt.hashSync("dummy-password-never-used", 10);

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 16_384);
    const nidn = requiredString(body.nidn, "NIDN", 3, 30);
    const password = requiredString(body.password, "Password", 1, 128);

    const dpl = await findDplByNidn(nidn);

    const isMatch = await bcrypt.compare(password, dpl?.password || DUMMY_PASSWORD_HASH);

    if (!dpl || !isMatch) {
      throw new AppError("NIDN atau Password DPL tidak valid.", 401);
    }

    await createSession({
      role: "dpl",
      nidn: dpl.nidn,
      nama: dpl.nama,
    });

    return NextResponse.json({
      success: true,
      message: "Otentikasi DPL berhasil.",
      session: {
        nama: dpl.nama,
        nidn: dpl.nidn,
        fakultas: dpl.fakultas,
        skema: dpl.skema,
        email: dpl.email || "",
        noHp: dpl.noHp || "",
        alamat: dpl.alamat || "",
        foto: dpl.foto || "",
        role: "Dosen Pembimbing Lapangan (DPL)",
        loggedInAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
