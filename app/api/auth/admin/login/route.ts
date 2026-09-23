import { NextResponse } from "next/server";
import { findAdminByUsername } from "@/lib/db";
import { createSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { AppError, handleError } from "@/lib/error";
import { readJsonObject, requiredString } from "@/lib/api-validation";

const DUMMY_PASSWORD_HASH = bcrypt.hashSync("dummy-password-never-used", 10);

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 16_384);
    const username = requiredString(body.username, "Username", 1, 254);
    const password = requiredString(body.password, "Password", 1, 128);

    const admin = await findAdminByUsername(username);

    // Some Postgres installations (or external tools) may store bcrypt hashes
    // with the $2y$ prefix; bcryptjs accepts $2a$/$2b$ but not $2y$ in some cases.
    // Normalize $2y$ -> $2b$ before comparing.
    let stored = admin ? (admin.password || "") : "";
    if (stored.startsWith('$2y$')) stored = '$2b$' + stored.slice(4);
    const isMatch = await bcrypt.compare(password, stored || DUMMY_PASSWORD_HASH);

    if (!admin || !isMatch) {
      throw new AppError("Username atau Password Admin tidak valid.", 401);
    }

    await createSession({
      role: "admin",
      username: admin.username,
      nama: admin.nama,
      email: admin.email,
    });

    return NextResponse.json({
      success: true,
      message: "Otentikasi Admin LPPM berhasil.",
      session: {
        username: admin.username,
        nama: admin.nama,
        email: admin.email,
        role: admin.role,
        loggedInAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
