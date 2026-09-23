import { NextResponse } from "next/server";
import { findUserByNpm, getProfileByNpm } from "@/lib/db";
import { createSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { AppError, handleError } from "@/lib/error";
import { readJsonObject, requiredString } from "@/lib/api-validation";

const DUMMY_PASSWORD_HASH = bcrypt.hashSync("dummy-password-never-used", 10);

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 16_384);
    const npm = requiredString(body.npm, "NPM", 5, 20);
    const password = requiredString(body.password, "Password", 1, 128);
    if (!/^\d{5,20}$/.test(npm)) throw new AppError("Format NPM tidak valid.", 400);

    const user = await findUserByNpm(npm);

    const isMatch = await bcrypt.compare(password, user?.password || DUMMY_PASSWORD_HASH);

    if (!user || !isMatch) {
      throw new AppError("NPM atau Password yang Anda masukkan tidak valid.", 401);
    }

    const profile = await getProfileByNpm(user.npm);

    await createSession({
      role: "mahasiswa",
      npm: user.npm,
      nama: user.nama,
    });

    return NextResponse.json({
      success: true,
      message: "Login berhasil.",
      user: {
        nama: user.nama,
        npm: user.npm,
      },
      profile: profile || null,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
