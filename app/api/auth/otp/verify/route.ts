import { NextResponse } from "next/server";
import { AppError, handleError } from "@/lib/error";
import { readJsonObject, requiredString } from "@/lib/api-validation";
import { verifyOtp, normalizePhoneExport } from "@/lib/services/otp";
import { createSession } from "@/lib/session";
import { findUserByNpm, registerVerifiedUserFromOtp } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 16_384);
    const noHpRaw = requiredString(body.noHp || body.phone || body.identifier, "Nomor HP", 8, 20);
    const otp = requiredString(body.otp, "Kode OTP", 4, 10);
    // npm may be provided for cross-check, but we use identifier (phone)
    const normalizedPhone = normalizePhoneExport(noHpRaw);
    if (!normalizedPhone) throw new AppError("Format nomor HP tidak valid.", 400);

    const result = await verifyOtp(normalizedPhone, otp.trim());
    if (!result.valid || !result.record) {
      throw new AppError(result.error || "OTP tidak valid.", 400);
    }

    const rec = result.record;
    const nama = String(rec.nama || "").trim();
    const npm = String(rec.npm || "").trim();
    const passwordHash = String(rec.password_hash || "").trim();
    const phone = String(rec.phone || normalizedPhone).trim();

    if (!nama || !npm || !passwordHash) {
      throw new AppError("Data OTP tidak lengkap. Silakan minta OTP baru.", 400);
    }

    // Cek lagi tidak duplikat
    const existing = await findUserByNpm(npm);
    if (existing) throw new AppError("NPM sudah terdaftar. Silakan login.", 409);

    await registerVerifiedUserFromOtp({
      nama,
      npm,
      passwordHash,
      phone,
    });

    // Buat session langsung login
    await createSession({
      role: "mahasiswa",
      npm: npm,
      nama: nama,
    });

    return NextResponse.json({
      success: true,
      message: "Verifikasi OTP berhasil. Akun dibuat.",
      user: { nama, npm, phone },
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
