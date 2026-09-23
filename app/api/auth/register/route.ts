import { NextResponse } from "next/server";
import { registerUser, findUserByNpm } from "@/lib/db";
import { createSession } from "@/lib/session";
import { AppError, handleError } from "@/lib/error";
import { readJsonObject, requiredString } from "@/lib/api-validation";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 16_384);
    const nama = requiredString(body.nama, "Nama", 2, 120);
    const npm = requiredString(body.npm, "NPM", 5, 20);
    const password = requiredString(body.password, "Password", 12, 128);

    if (!/^\d{5,20}$/.test(npm)) {
      throw new AppError("Format NPM tidak valid.", 400);
    }

    const existing = await findUserByNpm(npm);
    if (existing) {
      throw new AppError("NPM sudah terdaftar. Silakan lakukan login.", 409);
    }

    const user = await registerUser(nama, npm, password);

    await createSession({
      role: "mahasiswa",
      npm: user.npm,
      nama: user.nama,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Registrasi akun mahasiswa berhasil.",
        user: {
          nama: user.nama,
          npm: user.npm,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return handleError(error);
  }
}
