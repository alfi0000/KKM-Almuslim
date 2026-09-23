import { mysql } from "../mysql";
import { isoDateTime, type DbRow } from "../db-utils";
import { TimelineRecord } from "../types";

function mapRow(row: DbRow): TimelineRecord {
  return {
    id: Number(row.id),
    judul: String(row.judul ?? ""),
    tanggal: String(row.tanggal ?? ""),
    deskripsi: typeof row.deskripsi === "string" ? row.deskripsi : "",
    status: String(row.status || "Akan Datang"),
    urutan: Number(row.urutan) || 0,
    createdAt: isoDateTime(row.created_at),
  };
}

export async function getTimeline(): Promise<TimelineRecord[]> {
  const rows = await mysql.queryRows("SELECT id, judul, tanggal, deskripsi, status, urutan, created_at FROM timeline ORDER BY urutan ASC, id ASC");
  return rows.map(mapRow);
}

export async function addTimeline(entry: Omit<TimelineRecord, "id" | "createdAt">): Promise<TimelineRecord> {
  const result = await mysql.execute(
    "INSERT INTO timeline (judul, tanggal, deskripsi, status, urutan) VALUES (?, ?, ?, ?, ?)",
    [entry.judul.trim(), entry.tanggal.trim(), entry.deskripsi.trim(), entry.status.trim() || "Akan Datang", entry.urutan || 0]
  );
  const row = await mysql.queryOne("SELECT id, judul, tanggal, deskripsi, status, urutan, created_at FROM timeline WHERE id = ?", [result.insertId]);
  if (!row) throw new Error("Gagal menambah timeline.");
  return mapRow(row);
}

export async function deleteTimeline(id: number): Promise<boolean> {
  const result = await mysql.execute("DELETE FROM timeline WHERE id = ?", [id]);
  return result.affectedRows > 0;
}
