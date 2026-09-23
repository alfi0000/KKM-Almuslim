import { NextResponse } from "next/server";
import { findUserByNpm, phoneIsRegistered } from "@/lib/db";
import { AppError, handleError } from "@/lib/error";
import { readJsonObject, requiredString } from "@/lib/api-validation";
import bcrypt from "bcryptjs";
import { createOtp, normalizePhoneExport } from "@/lib/services/otp";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";

// Throttle OTP per phone & per IP agar tidak bisa membanjiri Telegram
const otpPhoneCounters = new Map<string, { count: number; start: number }>();
const OTP_PHONE_WINDOW_MS = 10 * 60_000;
const OTP_PHONE_MAX = 3;

function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const candidate = forwarded || realIp;
  return candidate && /^[0-9a-f:.]+$/i.test(candidate) ? candidate : undefined;
}

function isOtpPhoneRateLimited(key: string): boolean {
  const now = Date.now();
  // cleanup sesekali
  if (otpPhoneCounters.size > 1000) {
    for (const [k, v] of otpPhoneCounters) if (now - v.start >= OTP_PHONE_WINDOW_MS) otpPhoneCounters.delete(k);
  }
  const entry = otpPhoneCounters.get(key) || { count: 0, start: now };
  if (now - entry.start >= OTP_PHONE_WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  otpPhoneCounters.set(key, entry);
  return entry.count > OTP_PHONE_MAX;
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 16_384);
    const nama = requiredString(body.nama, "Nama", 2, 120);
    const npmRaw = body.npm ? requiredString(body.npm, "NPM", 5, 20) : "";
    const noHpRaw = requiredString(body.noHp || body.phone || body.telepon, "Nomor HP (Telegram)", 8, 20);
    const password = requiredString(body.password, "Password", 12, 128);

    // NPM optional? Jika user tidak kirim npm, gunakan noHp sebagai npm (fallback)
    let npm = npmRaw ? String(npmRaw).trim() : "";
    if (!npm) {
      // generate from phone digits
      const norm = normalizePhoneExport(noHpRaw);
      if (!norm) throw new AppError("Format nomor HP tidak valid.", 400);
      npm = norm.slice(-10); // fallback last 10 digits as npm-like
    }
    if (npm && !/^\d{5,20}$/.test(npm)) {
      throw new AppError("Format NPM tidak valid.", 400);
    }

    const normalizedPhone = normalizePhoneExport(noHpRaw);
    if (!normalizedPhone) throw new AppError("Format nomor HP Telegram tidak valid. Contoh: 081234567890", 400);

    // Batasi OTP per nomor HP dan per IP untuk cegah spam Telegram
    const clientIp = getClientIp(request);
    const phoneRateLimited = isOtpPhoneRateLimited(`otp:${normalizedPhone}`);
    const ipRateLimited = clientIp ? isOtpPhoneRateLimited(`otp:ip:${clientIp}`) : false;
    if (phoneRateLimited || ipRateLimited) {
      throw new AppError("Terlalu banyak permintaan OTP. Silakan tunggu 10 menit.", 429, true, 600);
    }

    const existing = npm ? await findUserByNpm(npm) : null;
    if (existing) throw new AppError("NPM sudah terdaftar. Silakan lakukan login.", 409);

    if (await phoneIsRegistered(normalizedPhone, noHpRaw)) {
      throw new AppError("Nomor HP sudah terdaftar. Gunakan nomor lain atau login.", 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { otp } = await createOtp({
      identifier: normalizedPhone,
      nama,
      npm,
      phone: normalizedPhone,
      passwordHash,
    });

    // Kirim via Telegram
    const telegramText = [
      `<b>🔐 KODE OTP PENDAFTARAN KKM UMUSLIM</b>`,
      ``,
      `Halo <b>${escapeHtml(nama)}</b>,`,
      `Kode OTP Anda untuk membuat akun KKM:`,
      ``,
      `<code>${otp}</code>`,
      ``,
      `Berlaku 5 menit. Jangan bagikan kode ini.`,
      `NPM: ${escapeHtml(npm)} | HP: ${escapeHtml(noHpRaw)} → <a href="https://wa.me/${normalizedPhone}">https://wa.me/${normalizedPhone}</a>`,
    ].join("\n");

    const sent = await sendTelegramMessage(telegramText);

    const isDev = process.env.NODE_ENV !== "production";
    // JANGAN PERNAH mengembalikan OTP di production, bahkan jika Telegram gagal
    if (!sent && !isDev) {
      throw new AppError("Gagal mengirim kode OTP via Telegram. Silakan coba lagi dalam beberapa saat.", 503);
    }

    return NextResponse.json({
      success: true,
      message: sent ? "Kode OTP telah dikirim ke Telegram. Silakan cek Telegram Anda." : "Kode OTP dibuat (mode pengembangan).",
      identifier: normalizedPhone,
      npm,
      ...(isDev ? { otp, devOtp: otp } : {}),
      telegramSent: sent,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
