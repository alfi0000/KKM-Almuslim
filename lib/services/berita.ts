import { mysql, type MysqlRow } from "../mysql";
import { isoDateTime } from "../db-utils";
import { BeritaRecord } from "../types";

function mapRow(row: MysqlRow): BeritaRecord {
  return {
    id: Number(row.id),
    judul: String(row.judul ?? ""),
    kategori: String(row.kategori ?? ""),
    tanggal: String(row.tanggal ?? ""),
    penulis: String(row.penulis ?? ""),
    gambar: String(row.gambar ?? ""),
    konten: String(row.konten ?? ""),
    createdAt: isoDateTime(row.created_at),
  };
}

export async function getBerita(): Promise<BeritaRecord[]> {
  const rows = await mysql.queryRows("SELECT id, judul, kategori, tanggal, penulis, gambar, konten, created_at FROM berita ORDER BY id DESC");
  return rows.map(mapRow);
}

export async function addBerita(entry: Omit<BeritaRecord, "id">): Promise<BeritaRecord> {
  const result = await mysql.execute(
    "INSERT INTO berita (judul, kategori, tanggal, penulis, gambar, konten) VALUES (?, ?, ?, ?, ?, ?)",
    [entry.judul, entry.kategori, entry.tanggal, entry.penulis, entry.gambar || "", entry.konten]
  );
  const row = await mysql.queryOne("SELECT id, judul, kategori, tanggal, penulis, gambar, konten, created_at FROM berita WHERE id = ?", [result.insertId]);
  if (!row) throw new Error("Gagal membuat berita.");
  return mapRow(row);
}

export async function deleteBerita(id: number): Promise<boolean> {
  const result = await mysql.execute("DELETE FROM berita WHERE id = ?", [id]);
  return result.affectedRows > 0;
}
