import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/authorization";
import { handleError, AppError } from "@/lib/error";
import { requiredString, readJsonObject } from "@/lib/api-validation";
import { findUserByNpm, updateStudentPassword } from "@/lib/db";

const DUMMY_PASSWORD_HASH = bcrypt.hashSync("dummy-password-never-used", 10);

export async function POST(request: Request) {
  try {
    const session = await requireStudent();
    const body = await readJsonObject(request, 16_384);
    const currentPassword = requiredString(body.currentPassword, "Password saat ini", 1, 128);
    const newPassword = requiredString(body.newPassword, "Password baru", 12, 128);
    if (currentPassword === newPassword) {
      throw new AppError("Password baru harus berbeda dari password saat ini.", 400);
    }

    const user = await findUserByNpm(session.npm);
    const isValid = await bcrypt.compare(currentPassword, user?.password || DUMMY_PASSWORD_HASH);
    if (!user || !isValid) {
      throw new AppError("Password saat ini tidak sesuai.", 400);
    }

    await updateStudentPassword(session.npm, newPassword);
    return NextResponse.json({ success: true, message: "Password berhasil diperbarui." });
  } catch (error: unknown) {
    return handleError(error);
  }
}
