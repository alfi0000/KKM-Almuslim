import { mysql } from "../mysql";
import { isoDateTime, type DbRow } from "../db-utils";
import { DokumenRecord } from "../types";

function mapRow(row: DbRow): DokumenRecord {
  return {
    id: Number(row.id),
    judul: String(row.judul ?? ""),
    kategori: String(row.kategori ?? ""),
    deskripsi: typeof row.deskripsi === "string" ? row.deskripsi : "",
    fileUrl: String(row.file_url ?? ""),
    format: String(row.format ?? "PDF").toUpperCase(),
    ukuran: Number(row.ukuran) || 0,
    createdAt: isoDateTime(row.created_at),
  };
}

export async function getDokumen(): Promise<DokumenRecord[]> {
  const rows = await mysql.queryRows("SELECT id, judul, kategori, deskripsi, file_url, format, ukuran, created_at FROM dokumen ORDER BY id DESC");
  return rows.map(mapRow);
}

export async function addDokumen(entry: Omit<DokumenRecord, "id" | "createdAt">): Promise<DokumenRecord> {
  const result = await mysql.execute(
    "INSERT INTO dokumen (judul, kategori, deskripsi, file_url, format, ukuran) VALUES (?, ?, ?, ?, ?, ?)",
    [entry.judul.trim(), entry.kategori.trim(), entry.deskripsi.trim(), entry.fileUrl, entry.format.toUpperCase(), entry.ukuran]
  );
  const row = await mysql.queryOne("SELECT id, judul, kategori, deskripsi, file_url, format, ukuran, created_at FROM dokumen WHERE id = ?", [result.insertId]);
  if (!row) throw new Error("Gagal menambah dokumen.");
  return mapRow(row);
}

export async function deleteDokumen(id: number): Promise<boolean> {
  const result = await mysql.execute("DELETE FROM dokumen WHERE id = ?", [id]);
  return result.affectedRows > 0;
}
