import bcrypt from "bcryptjs";
import { UserRecord } from "../types";
import { isoDateTime, type DbRow } from "../db-utils";
import {
  findUserRowById,
  findUserRowByNpm,
  insertPendingUser,
  insertVerifiedUser,
  updateUserPasswordHash,
  updateUserVerification,
  userPhoneExists,
} from "@/repositories/users";

function rowToUser(row: DbRow): UserRecord {
  return {
    id: Number(row.id),
    nama: String(row.nama ?? ""),
    npm: String(row.npm ?? ""),
    password: typeof row.password === "string" ? row.password : undefined,
    createdAt: isoDateTime(row.created_at),
    diverifikasi: Boolean(row.diverifikasi),
  };
}

export async function findUserByNpm(npm: string): Promise<UserRecord | undefined> {
  const row = await findUserRowByNpm(npm.trim());
  return row ? rowToUser(row as DbRow) : undefined;
}

export async function phoneIsRegistered(phone: string, rawPhone?: string): Promise<boolean> {
  return userPhoneExists(phone, rawPhone?.trim() || phone);
}

export async function registerUser(
  nama: string,
  npm: string,
  password: string
): Promise<UserRecord> {
  const existingUser = await findUserByNpm(npm);
  if (existingUser) throw new Error('NPM sudah terdaftar di sistem.');

  const hashedPassword = await bcrypt.hash(password.trim(), 10);
  const id = await insertPendingUser({
    nama: nama.trim(),
    npm: npm.trim(),
    passwordHash: hashedPassword,
  });
  const row = await findUserRowById(id);
  if (!row) throw new Error("Gagal membuat pengguna.");
  return rowToUser(row as DbRow);
}

export async function setVerifikasiPendaftar(npm: string, diverifikasi: boolean): Promise<void> {
  await updateUserVerification(npm.trim(), diverifikasi);
}

export async function updateStudentPassword(npm: string, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password.trim(), 10);
  await updateUserPasswordHash(npm.trim(), passwordHash);
}

export async function registerVerifiedUserFromOtp(entry: {
  nama: string;
  npm: string;
  passwordHash: string;
  phone: string;
}): Promise<UserRecord> {
  const id = await insertVerifiedUser({
    nama: entry.nama.trim(),
    npm: entry.npm.trim(),
    passwordHash: entry.passwordHash,
    phone: entry.phone,
  });
  const row = await findUserRowById(id);
  if (!row) throw new Error("Gagal membuat pengguna.");
  return rowToUser(row as DbRow);
}
