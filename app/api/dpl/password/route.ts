import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireDpl } from "@/lib/authorization";
import { handleError, AppError } from "@/lib/error";
import { requiredString, readJsonObject } from "@/lib/api-validation";
import { findDplByNidn, updateDplPassword } from "@/lib/db";

const DUMMY_PASSWORD_HASH = bcrypt.hashSync("dummy-password-never-used", 10);

export async function POST(request: Request) {
  try {
    const session = await requireDpl();
    const body = await readJsonObject(request, 16_384);
    const currentPassword = requiredString(body.currentPassword, "Password saat ini", 1, 128);
    const newPassword = requiredString(body.newPassword, "Password baru", 12, 128);
    if (currentPassword === newPassword) {
      throw new AppError("Password baru harus berbeda dari password saat ini.", 400);
    }

    const dpl = await findDplByNidn(session.nidn);
    const isValid = await bcrypt.compare(currentPassword, dpl?.password || DUMMY_PASSWORD_HASH);
    if (!dpl || !isValid) {
      throw new AppError("Password saat ini tidak sesuai.", 400);
    }

    await updateDplPassword(session.nidn, newPassword);
    return NextResponse.json({ success: true, message: "Password berhasil diperbarui." });
  } catch (error: unknown) {
    return handleError(error);
  }
}
