import crypto from "node:crypto";
import { isoDateTime } from "../db-utils";
import { withMysqlTransaction, type MysqlRow } from "../mysql";

export interface OtpRecord {
  id?: number;
  identifier: string;
  otp: string;
  nama?: string;
  npm?: string;
  phone?: string;
  password_hash?: string;
  expires_at: string;
  attempts?: number;
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  let n = digits;
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("62")) {}
  else if (n.startsWith("8")) n = "62" + n;
  else return null;
  if (!/^62\d{8,13}$/.test(n)) return null;
  return n;
}

function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function mapOtp(row: MysqlRow): OtpRecord {
  return {
    id: Number(row.id),
    identifier: String(row.identifier ?? ""),
    otp: String(row.otp ?? ""),
    nama: typeof row.nama === "string" ? row.nama : undefined,
    npm: typeof row.npm === "string" ? row.npm : undefined,
    phone: typeof row.phone === "string" ? row.phone : undefined,
    password_hash: typeof row.password_hash === "string" ? row.password_hash : undefined,
    expires_at: isoDateTime(row.expires_at) || "",
    attempts: Number(row.attempts) || 0,
  };
}

export async function createOtp(params: {
  identifier: string;
  nama: string;
  npm?: string;
  phone: string;
  passwordHash: string;
}): Promise<{ otp: string; expiresAt: string }> {
  const otp = generateOtp();
  const expiresAtDate = new Date(Date.now() + 5 * 60 * 1000);
  const expiresAt = expiresAtDate.toISOString();
  const identifier = normalizePhone(params.identifier) || params.identifier.trim();

  await withMysqlTransaction(async (database) => {
    await database.execute("DELETE FROM otp_codes WHERE identifier = ?", [identifier]);
    await database.execute(
      `INSERT INTO otp_codes
        (identifier, otp, nama, npm, phone, password_hash, expires_at, attempts)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [identifier, otp, params.nama, params.npm || null, params.phone, params.passwordHash, expiresAtDate]
    );
  });
  return { otp, expiresAt };
}

export async function verifyOtp(identifier: string, otpInput: string): Promise<{ valid: boolean; record?: OtpRecord; error?: string }> {
  const normId = normalizePhone(identifier) || identifier.trim();
  return withMysqlTransaction(async (database) => {
    const row = await database.queryOne(
      "SELECT * FROM otp_codes WHERE identifier = ? ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
      [normId]
    );
    if (!row) return { valid: false, error: "OTP tidak ditemukan. Silakan minta ulang." };

    const rec = mapOtp(row);
    if (new Date(rec.expires_at).getTime() < Date.now()) {
      await database.execute("DELETE FROM otp_codes WHERE id = ?", [rec.id || 0]);
      return { valid: false, error: "OTP sudah kedaluwarsa. Silakan minta OTP baru." };
    }
    if ((rec.attempts || 0) >= 5) {
      await database.execute("DELETE FROM otp_codes WHERE id = ?", [rec.id || 0]);
      return { valid: false, error: "Terlalu banyak percobaan. Minta OTP baru." };
    }
    if (rec.otp !== otpInput.trim()) {
      await database.execute("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?", [rec.id || 0]);
      return { valid: false, error: "Kode OTP salah." };
    }

    await database.execute("DELETE FROM otp_codes WHERE id = ?", [rec.id || 0]);
    return { valid: true, record: rec };
  });
}

export function normalizePhoneExport(raw: string) {
  return normalizePhone(raw);
}
