import crypto from "crypto";
import bcrypt from "bcryptjs";
import { mysql, type MysqlRow } from "../mysql";
import { getSession } from "../session";
import { DplRecord } from "../types";

const DPL_COLUMNS = "id, nama, nidn, password, fakultas, skema, kecamatan, email, no_hp, alamat, foto";

function mapRow(row: MysqlRow): DplRecord {
  return {
    id: Number(row.id),
    nama: String(row.nama ?? ""),
    nidn: String(row.nidn ?? ""),
    password: typeof row.password === "string" ? row.password : undefined,
    fakultas: String(row.fakultas ?? ""),
    skema: String(row.skema ?? ""),
    kecamatan: typeof row.kecamatan === "string" ? row.kecamatan : undefined,
    email: typeof row.email === "string" ? row.email : undefined,
    noHp: typeof row.no_hp === "string" ? row.no_hp : undefined,
    alamat: typeof row.alamat === "string" ? row.alamat : undefined,
    foto: typeof row.foto === "string" ? row.foto : undefined,
  };
}

export async function getDpls(): Promise<DplRecord[]> {
  const rows = await mysql.queryRows(`SELECT ${DPL_COLUMNS} FROM dpls ORDER BY id DESC`);
  return rows.map(mapRow);
}

export async function addDpl(entry: Omit<DplRecord, "id">): Promise<DplRecord> {
  const plainPassword = entry.password ? String(entry.password) : crypto.randomBytes(12).toString("hex");
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  const result = await mysql.execute(
    `INSERT INTO dpls (nama, nidn, password, fakultas, skema, kecamatan, email, no_hp, alamat, foto)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.nama.trim(), entry.nidn.trim(), hashedPassword, entry.fakultas.trim(), entry.skema.trim(),
      entry.kecamatan?.trim() || null, entry.email?.trim() || null, entry.noHp?.trim() || null,
      entry.alamat?.trim() || null, entry.foto?.trim() || null,
    ]
  );
  const row = await mysql.queryOne(`SELECT ${DPL_COLUMNS} FROM dpls WHERE id = ?`, [result.insertId]);
  if (!row) throw new Error("Gagal menambah DPL.");
  return mapRow(row);
}

export async function deleteDpl(id: number): Promise<boolean> {
  const result = await mysql.execute("DELETE FROM dpls WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

export async function updateDplByAdmin(id: number, entry: {
  nama: string;
  nidn: string;
  fakultas: string;
  skema: string;
  kecamatan?: string;
  password?: string;
}): Promise<DplRecord> {
  const passwordHash = entry.password ? await bcrypt.hash(entry.password.trim(), 10) : undefined;
  const result = await mysql.execute(
    `UPDATE dpls
     SET nama = ?, nidn = ?, fakultas = ?, skema = ?, kecamatan = ?${passwordHash ? ", password = ?" : ""}
     WHERE id = ?`,
    passwordHash
      ? [entry.nama.trim(), entry.nidn.trim(), entry.fakultas.trim(), entry.skema.trim(), entry.kecamatan?.trim() || null, passwordHash, id]
      : [entry.nama.trim(), entry.nidn.trim(), entry.fakultas.trim(), entry.skema.trim(), entry.kecamatan?.trim() || null, id]
  );
  if (result.affectedRows === 0) throw new Error("DPL tidak ditemukan.");

  const row = await mysql.queryOne(`SELECT ${DPL_COLUMNS} FROM dpls WHERE id = ?`, [id]);
  if (!row) throw new Error("Gagal memperbarui DPL.");
  return mapRow(row);
}

export async function updateDplProfile(profile: {
  nidn: string;
  nama: string;
  fakultas: string;
  skema: string;
  kecamatan?: string;
  email?: string;
  noHp?: string;
  alamat?: string;
  foto?: string;
}): Promise<DplRecord> {
  const cleanNidn = profile.nidn.trim();
  const existing = await findDplByNidn(cleanNidn);
  if (!existing) throw new Error('DPL tidak ditemukan.');
  const values = [
    profile.nama.trim(), profile.fakultas.trim(), profile.skema.trim(), profile.kecamatan?.trim() || null,
    profile.email?.trim() || null, profile.noHp?.trim() || null, profile.alamat?.trim() || null,
    profile.foto?.trim() || null,
  ];
  await mysql.execute(
    `UPDATE dpls SET nama = ?, fakultas = ?, skema = ?, kecamatan = ?, email = ?, no_hp = ?, alamat = ?, foto = ?
     WHERE nidn = ?`,
    [...values, cleanNidn]
  );
  const updated = await findDplByNidn(cleanNidn);
  if (!updated) throw new Error('Gagal memperbarui profil DPL.');
  return updated;
}

export async function findDplByNidn(nidn: string): Promise<DplRecord | undefined> {
  const cleanNidn = nidn.trim();
  const row = await mysql.queryOne(`SELECT ${DPL_COLUMNS} FROM dpls WHERE nidn = ? LIMIT 1`, [cleanNidn]);
  return row ? mapRow(row) : undefined;
}

export async function updateDplPassword(nidn: string, password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password.trim(), 10);
  const result = await mysql.execute("UPDATE dpls SET password = ? WHERE nidn = ?", [passwordHash, nidn.trim()]);
  if (result.affectedRows === 0) throw new Error("DPL tidak ditemukan.");
}

export async function getDplNamaFromSession(): Promise<string | null> {
  const session = await getSession("dpl");
  if (!session || session.role !== "dpl") return null;
  const dpl = session.nidn ? await findDplByNidn(session.nidn) : undefined;
  return dpl?.nama || session.nama || null;
}

export async function isStudentUnderDpl(npm: string, dplNama: string): Promise<boolean> {
  const row = await mysql.queryOne(
    `SELECT 1 AS found
     FROM student_profiles sp
     LEFT JOIN dpls d ON d.id = sp.dpl_id
     WHERE sp.npm = ? AND LOWER(COALESCE(d.nama, sp.dpl, '')) = LOWER(?)
     LIMIT 1`,
    [npm.trim(), dplNama.trim()]
  );
  return Boolean(row);
}

export async function isLogbookUnderDpl(logbookId: number, dplNama: string): Promise<boolean> {
  const row = await mysql.queryOne(
    `SELECT 1 AS found
     FROM logbooks l
     INNER JOIN student_profiles sp ON sp.npm = l.npm
     LEFT JOIN dpls d ON d.id = sp.dpl_id
     WHERE l.id = ? AND LOWER(COALESCE(d.nama, sp.dpl, '')) = LOWER(?)
     LIMIT 1`,
    [logbookId, dplNama.trim()]
  );
  return Boolean(row);
}

export async function isLaporanUnderDpl(laporanId: number, dplNama: string): Promise<boolean> {
  const row = await mysql.queryOne(
    `SELECT 1 AS found
     FROM laporans l
     INNER JOIN student_profiles sp ON sp.npm = l.npm
     LEFT JOIN dpls d ON d.id = sp.dpl_id
     WHERE l.id = ? AND LOWER(COALESCE(d.nama, sp.dpl, '')) = LOWER(?)
     LIMIT 1`,
    [laporanId, dplNama.trim()]
  );
  return Boolean(row);
}
