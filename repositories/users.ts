import { mysql, type MysqlRow } from "@/lib/mysql";

const USER_COLUMNS = "id, nama, npm, password, created_at, diverifikasi";

export function findUserRowByNpm(npm: string): Promise<MysqlRow | undefined> {
  return mysql.queryOne<MysqlRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE npm = ? LIMIT 1`,
    [npm]
  );
}

export function findUserRowById(id: number): Promise<MysqlRow | undefined> {
  return mysql.queryOne<MysqlRow>(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
}

export async function userPhoneExists(phone: string, rawPhone: string): Promise<boolean> {
  const row = await mysql.queryOne(
    `SELECT id FROM users
     WHERE phone_canonical = ? OR phone = ? OR no_hp = ? OR phone = ? OR no_hp = ?
     LIMIT 1`,
    [phone, phone, phone, rawPhone, rawPhone]
  );
  return Boolean(row);
}

export async function insertPendingUser(entry: {
  nama: string;
  npm: string;
  passwordHash: string;
}): Promise<number> {
  const result = await mysql.execute(
    "INSERT INTO users (nama, npm, password, diverifikasi) VALUES (?, ?, ?, FALSE)",
    [entry.nama, entry.npm, entry.passwordHash]
  );
  return result.insertId;
}

export async function insertVerifiedUser(entry: {
  nama: string;
  npm: string;
  passwordHash: string;
  phone: string;
}): Promise<number> {
  const result = await mysql.execute(
    `INSERT INTO users (nama, npm, password, phone, no_hp, diverifikasi)
     VALUES (?, ?, ?, ?, ?, TRUE)`,
    [entry.nama, entry.npm, entry.passwordHash, entry.phone, entry.phone]
  );
  return result.insertId;
}

export async function updateUserVerification(npm: string, diverifikasi: boolean): Promise<void> {
  await mysql.execute("UPDATE users SET diverifikasi = ? WHERE npm = ?", [diverifikasi, npm]);
}

export async function updateUserPasswordHash(npm: string, passwordHash: string): Promise<void> {
  await mysql.execute("UPDATE users SET password = ? WHERE npm = ?", [passwordHash, npm]);
}
