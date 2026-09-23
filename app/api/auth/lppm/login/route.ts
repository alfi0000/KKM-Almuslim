import { NextResponse } from "next/server";
import { findLppmByUsername } from "@/lib/db";
import { createSession } from "@/lib/session";
import bcrypt from "bcryptjs";
import { AppError, handleError } from "@/lib/error";
import { readJsonObject, requiredString } from "@/lib/api-validation";

const DUMMY_PASSWORD_HASH = bcrypt.hashSync("dummy-password-never-used", 10);

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 16_384);
    const username = requiredString(body.username, "Username", 1, 128);
    const password = requiredString(body.password, "Password", 1, 128);

    const lppm = await findLppmByUsername(username);

    let stored = lppm ? (lppm.password || "") : "";
    if (stored.startsWith("$2y$")) stored = "$2b$" + stored.slice(4);
    const isMatch = await bcrypt.compare(password, stored || DUMMY_PASSWORD_HASH);

    if (!lppm || !isMatch) {
      throw new AppError("Username atau Password LPPM tidak valid.", 401);
    }

    await createSession({
      role: "lppm",
      username: lppm.username,
      nama: lppm.nama,
    });

    return NextResponse.json({
      success: true,
      message: "Otentikasi LPPM berhasil.",
      session: {
        username: lppm.username,
        nama: lppm.nama,
        role: "lppm",
        loggedInAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
