import { isoDateTime } from "../db-utils";
import { mysql, type SqlValue } from "../mysql";
import { LaporanRecord } from "../types";
import type { DbRow } from "../db-utils";

const LAPORAN_COLUMNS = "id, npm, jenis, nama_file, file_url, file_type, file_size, tanggal_upload, status, catatan_dpl, created_at";

function rowToLaporan(r: DbRow): LaporanRecord {
  return {
    id: Number(r.id),
    npm: String(r.npm ?? ""),
    jenis: String(r.jenis ?? ""),
    namaFile: String(r.nama_file ?? ""),
    fileUrl: String(r.file_url ?? ""),
    fileType: typeof r.file_type === "string" ? r.file_type : undefined,
    fileSize: Number(r.file_size) || 0,
    tanggalUpload: String(r.tanggal_upload ?? ""),
    status: String(r.status ?? "Dalam Tinjauan"),
    catatanDpl: typeof r.catatan_dpl === "string" ? r.catatan_dpl : undefined,
    createdAt: isoDateTime(r.created_at),
  };
}

export async function getLaporansByNpm(npm?: string, limit?: number): Promise<LaporanRecord[]> {
  const lim = limit != null ? Math.min(Math.max(Math.floor(limit), 1), 1000) : undefined;
  if (npm) {
    const sql = lim != null
      ? `SELECT ${LAPORAN_COLUMNS} FROM laporans WHERE npm = ? ORDER BY id DESC LIMIT ?`
      : `SELECT ${LAPORAN_COLUMNS} FROM laporans WHERE npm = ? ORDER BY id DESC`;
    const params: import("../mysql").SqlValue[] = lim != null ? [npm.trim(), lim] : [npm.trim()];
    const rows = await mysql.queryRows(sql, params);
    return rows.map(rowToLaporan);
  }
  const sql = lim != null
    ? `SELECT ${LAPORAN_COLUMNS} FROM laporans ORDER BY id DESC LIMIT ?`
    : `SELECT ${LAPORAN_COLUMNS} FROM laporans ORDER BY id DESC`;
  const params: import("../mysql").SqlValue[] = lim != null ? [lim] : [];
  const rows = await mysql.queryRows(sql, params);
  return rows.map(rowToLaporan);
}

export async function getLaporansByNpms(npms: string[]): Promise<LaporanRecord[]> {
  const normalized = [...new Set(npms.map((npm) => npm.trim()).filter(Boolean))];
  if (normalized.length === 0) return [];
  const placeholders = normalized.map(() => "?").join(", ");
  const rows = await mysql.queryRows(
    `SELECT ${LAPORAN_COLUMNS} FROM laporans WHERE npm IN (${placeholders}) ORDER BY id DESC`,
    normalized
  );
  return rows.map(rowToLaporan);
}

export async function addLaporan(entry: Omit<LaporanRecord, "id">): Promise<LaporanRecord> {
  const result = await mysql.execute(
    `INSERT INTO laporans
      (npm, jenis, nama_file, file_url, file_type, file_size, tanggal_upload, status, catatan_dpl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [entry.npm.trim(), entry.jenis, entry.namaFile, entry.fileUrl, entry.fileType || null, entry.fileSize, entry.tanggalUpload, entry.status || "Dalam Tinjauan", entry.catatanDpl || null]
  );
  const row = await mysql.queryOne(`SELECT ${LAPORAN_COLUMNS} FROM laporans WHERE id = ?`, [result.insertId]);
  if (!row) throw new Error("Gagal menambah laporan.");
  return rowToLaporan(row);
}

export async function updateLaporan(id: number, npm: string, fields: Record<string, unknown>) {
  const columns: Record<string, string> = {
    jenis: "jenis", namaFile: "nama_file", fileUrl: "file_url", fileType: "file_type",
    fileSize: "file_size", tanggalUpload: "tanggal_upload", status: "status", catatanDpl: "catatan_dpl",
  };
  const updates: string[] = [];
  const values: SqlValue[] = [];
  for (const [key, value] of Object.entries(fields)) {
    const column = columns[key];
    if (!column || value === undefined || !["string", "number", "boolean"].includes(typeof value)) continue;
    updates.push(`${column} = ?`);
    values.push(value as string | number | boolean);
  }
  if (updates.length === 0) return;
  const result = await mysql.execute(
    `UPDATE laporans SET ${updates.join(", ")} WHERE id = ? AND npm = ?`,
    [...values, id, npm.trim()]
  );
  if (result.affectedRows === 0) throw new Error('Laporan tidak ditemukan atau bukan milik Anda.');
}

export async function updateLaporanStatus(id: number, status: string, catatanDpl: string) {
  await mysql.execute("UPDATE laporans SET status = ?, catatan_dpl = ? WHERE id = ?", [status, catatanDpl, id]);
}

export async function deleteLaporan(id: number): Promise<boolean> {
  const result = await mysql.execute("DELETE FROM laporans WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

// Dokumen kelompok yang setelah diunggah ketua dapat dilihat seluruh anggota gampong.
export const GROUP_REPORT_TYPES: readonly string[] = [
  "Laporan Mingguan Minggu 1",
  "Laporan Mingguan Minggu 2",
  "Laporan Mingguan Minggu 3",
  "Laporan Akhir KKM",
];

export async function getGroupLaporansByGampong(
  gampong: string,
  excludeNpm?: string
): Promise<Array<LaporanRecord & { penulis?: string }>> {
  const cleanGampong = gampong.trim();
  if (!cleanGampong) return [];

  const typePlaceholders = GROUP_REPORT_TYPES.map(() => "?").join(", ");
  const rows = await mysql.queryRows(
    `SELECT l.${LAPORAN_COLUMNS.replaceAll(", ", ", l.")}, sp.nama AS penulis
     FROM laporans l
     INNER JOIN student_profiles sp ON sp.npm = l.npm
     LEFT JOIN gampongs g ON g.id = sp.gampong_id
     WHERE LOWER(COALESCE(g.nama, sp.gampong, '')) = LOWER(?)
       AND l.jenis IN (${typePlaceholders})
       AND (? IS NULL OR l.npm <> ?)
     ORDER BY l.id DESC`,
    [cleanGampong, ...GROUP_REPORT_TYPES, excludeNpm?.trim() || null, excludeNpm?.trim() || ""]
  );
  return rows.map((row) => ({ ...rowToLaporan(row), penulis: String(row.penulis ?? "") }));
}
