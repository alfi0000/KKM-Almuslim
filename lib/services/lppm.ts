import { mysql } from "../mysql";
import { isoDateTime } from "../db-utils";
import { LppmStrukturRecord } from "../types";

function mapRow(row: Record<string, unknown>): LppmStrukturRecord {
  return {
    id: Number(row.id),
    label: String(row.label ?? ""),
    value: String(row.value ?? ""),
    urutan: Number(row.urutan) || 0,
    createdAt: isoDateTime(row.created_at),
  };
}

export async function getLppmStruktur(): Promise<LppmStrukturRecord[]> {
  const rows = await mysql.queryRows("SELECT id, label, value, urutan, created_at FROM lppm_struktur ORDER BY urutan ASC, id ASC");
  return rows.map(mapRow);
}

export async function addLppmStruktur(entry: Omit<LppmStrukturRecord, "id">): Promise<LppmStrukturRecord> {
  const result = await mysql.execute(
    "INSERT INTO lppm_struktur (label, value, urutan) VALUES (?, ?, ?)",
    [entry.label.trim(), entry.value.trim(), entry.urutan || 0]
  );
  const row = await mysql.queryOne("SELECT id, label, value, urutan, created_at FROM lppm_struktur WHERE id = ?", [result.insertId]);
  if (!row) throw new Error("Gagal menambah struktur LPPM.");
  return mapRow(row);
}

export async function deleteLppmStruktur(id: number): Promise<boolean> {
  const result = await mysql.execute("DELETE FROM lppm_struktur WHERE id = ?", [id]);
  return result.affectedRows > 0;
}
