import { isoDateTime } from "../db-utils";
import { mysql, type SqlValue } from "../mysql";
import { LogbookRecord } from "../types";
import type { DbRow } from "../db-utils";

const LOGBOOK_COLUMNS = "id, npm, tanggal, judul, lokasi, deskripsi, capaian_akhir, foto, foto_2, status, catatan_dpl, kategori, minggu, created_at";

function rowToLogbook(row: DbRow): LogbookRecord {
  return {
    id: Number(row.id),
    npm: String(row.npm ?? ""),
    tanggal: String(row.tanggal ?? ""),
    judul: String(row.judul ?? ""),
    lokasi: String(row.lokasi ?? ""),
    deskripsi: String(row.deskripsi ?? ""),
    foto: String(row.foto ?? ""),
    foto2: typeof row.foto_2 === "string" ? row.foto_2 : undefined,
    capaianAkhir: typeof row.capaian_akhir === "string" ? row.capaian_akhir : undefined,
    status: String(row.status ?? "Dalam Tinjauan"),
    catatanDpl: typeof row.catatan_dpl === "string" ? row.catatan_dpl : undefined,
    kategori: typeof row.kategori === "string" ? row.kategori : undefined,
    minggu: row.minggu == null ? undefined : Number(row.minggu),
    createdAt: isoDateTime(row.created_at),
  };
}

export async function getLogbooksByNpm(npm?: string, limit?: number): Promise<LogbookRecord[]> {
  const lim = limit != null ? Math.min(Math.max(Math.floor(limit), 1), 1000) : undefined;
  if (npm) {
    const sql = lim != null
      ? `SELECT ${LOGBOOK_COLUMNS} FROM logbooks WHERE npm = ? ORDER BY id DESC LIMIT ?`
      : `SELECT ${LOGBOOK_COLUMNS} FROM logbooks WHERE npm = ? ORDER BY id DESC`;
    const params: import("../mysql").SqlValue[] = lim != null ? [npm.trim(), lim] : [npm.trim()];
    const rows = await mysql.queryRows(sql, params);
    return rows.map(rowToLogbook);
  }
  const sql = lim != null
    ? `SELECT ${LOGBOOK_COLUMNS} FROM logbooks ORDER BY id DESC LIMIT ?`
    : `SELECT ${LOGBOOK_COLUMNS} FROM logbooks ORDER BY id DESC`;
  const params: import("../mysql").SqlValue[] = lim != null ? [lim] : [];
  const rows = await mysql.queryRows(sql, params);
  return rows.map(rowToLogbook);
}

export async function getLogbooksByNpms(npms: string[]): Promise<LogbookRecord[]> {
  const normalized = [...new Set(npms.map((npm) => npm.trim()).filter(Boolean))];
  if (normalized.length === 0) return [];
  const placeholders = normalized.map(() => "?").join(", ");
  const rows = await mysql.queryRows(
    `SELECT ${LOGBOOK_COLUMNS} FROM logbooks WHERE npm IN (${placeholders}) ORDER BY id DESC`,
    normalized
  );
  return rows.map(rowToLogbook);
}

export async function getLogbookCategoryForStudent(id: number, npm: string): Promise<string | undefined> {
  const row = await mysql.queryOne("SELECT kategori FROM logbooks WHERE id = ? AND npm = ? LIMIT 1", [id, npm.trim()]);
  if (!row) return undefined;
  const category = row.kategori;
  return typeof category === 'string' && category.trim() ? category : 'Mandiri';
}

export async function addLogbook(entry: Omit<LogbookRecord, "id">): Promise<LogbookRecord> {
  const result = await mysql.execute(
    `INSERT INTO logbooks (npm, tanggal, judul, lokasi, deskripsi, capaian_akhir, foto, foto_2, status, catatan_dpl, kategori, minggu)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [entry.npm.trim(), entry.tanggal, entry.judul, entry.lokasi, entry.deskripsi, entry.capaianAkhir || null, entry.foto || "", entry.foto2 || null, entry.status || "Dalam Tinjauan", entry.catatanDpl || null, entry.kategori || "Mandiri", entry.minggu || 1]
  );
  const row = await mysql.queryOne(`SELECT ${LOGBOOK_COLUMNS} FROM logbooks WHERE id = ?`, [result.insertId]);
  if (!row) throw new Error("Gagal menambah logbook.");
  return rowToLogbook(row);
}

export async function updateLogbook(id: number, npm: string, fields: Record<string, unknown>) {
  const columns: Record<string, string> = {
    tanggal: "tanggal", judul: "judul", lokasi: "lokasi", deskripsi: "deskripsi", capaianAkhir: "capaian_akhir", foto: "foto", foto2: "foto_2",
    status: "status", catatanDpl: "catatan_dpl", kategori: "kategori",
  };
  const updates: string[] = [];
  const values: SqlValue[] = [];
  for (const [key, value] of Object.entries(fields)) {
    const column = columns[key];
    if (!column || value === undefined || (typeof value !== "string" && value !== null)) continue;
    updates.push(`${column} = ?`);
    values.push(value);
  }
  if (updates.length === 0) return;
  const result = await mysql.execute(
    `UPDATE logbooks SET ${updates.join(", ")} WHERE id = ? AND npm = ?`,
    [...values, id, npm.trim()]
  );
  if (result.affectedRows === 0) throw new Error('Logbook tidak ditemukan atau bukan milik Anda.');
}

export async function updateLogbookStatus(id: number, status: string, catatanDpl: string) {
  await mysql.execute("UPDATE logbooks SET status = ?, catatan_dpl = ? WHERE id = ?", [status, catatanDpl, id]);
}

export async function deleteLogbook(id: number): Promise<boolean> {
  const result = await mysql.execute("DELETE FROM logbooks WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

export async function getKelompokLogbooksByGampong(
  gampong: string,
  excludeNpm?: string
): Promise<Array<LogbookRecord & { penulis?: string }>> {
  const cleanGampong = gampong.trim();
  if (!cleanGampong) return [];

  const rows = await mysql.queryRows(
    `SELECT l.${LOGBOOK_COLUMNS.replaceAll(", ", ", l.")}, sp.nama AS penulis
     FROM logbooks l
     INNER JOIN student_profiles sp ON sp.npm = l.npm
     LEFT JOIN gampongs g ON g.id = sp.gampong_id
     WHERE LOWER(COALESCE(g.nama, sp.gampong, '')) = LOWER(?)
       AND l.kategori = 'Kelompok'
       AND (? IS NULL OR l.npm <> ?)
     ORDER BY l.id DESC`,
    [cleanGampong, excludeNpm?.trim() || null, excludeNpm?.trim() || ""]
  );
  return rows.map((row) => ({ ...rowToLogbook(row), penulis: String(row.penulis ?? "") }));
}
