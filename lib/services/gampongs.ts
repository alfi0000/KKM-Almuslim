import { mysql } from "../mysql";
import { GampongRecord } from "../types";
import type { DbRow } from "../db-utils";

const GAMPONG_SELECT = `
  SELECT g.id, g.nama, g.skema, g.kabupaten, g.kecamatan,
         COALESCE(d.nama, g.dpl) AS dpl,
         g.keuchik, g.kontak_keuchik, g.posko, g.kuota
  FROM gampongs g
  LEFT JOIN dpls d ON d.id = g.dpl_id
`;

function mapRow(row: DbRow): GampongRecord {
  return {
    id: Number(row.id),
    nama: String(row.nama ?? ""),
    skema: String(row.skema ?? ""),
    kabupaten: String(row.kabupaten ?? ""),
    kecamatan: String(row.kecamatan ?? ""),
    dpl: row.dpl ? String(row.dpl) : undefined,
    keuchik: row.keuchik ? String(row.keuchik) : undefined,
    kontakKeuchik: row.kontak_keuchik ? String(row.kontak_keuchik) : undefined,
    posko: String(row.posko ?? ""),
    kuota: row.kuota != null ? Number(row.kuota) : undefined,
  };
}

export async function getGampongs(): Promise<GampongRecord[]> {
  const rows = await mysql.queryRows(`${GAMPONG_SELECT} ORDER BY g.id DESC`);
  return rows.map(mapRow);
}

export async function addGampong(entry: Omit<GampongRecord, "id">): Promise<GampongRecord> {
  const dplName = entry.dpl?.trim() || "Belum Ditentukan";
  const dpl = dplName === "Belum Ditentukan"
    ? undefined
    : await mysql.queryOne("SELECT id, nama FROM dpls WHERE LOWER(nama) = LOWER(?) LIMIT 1", [dplName]);
  const result = await mysql.execute(
    `INSERT INTO gampongs
      (nama, skema, kabupaten, kecamatan, dpl_id, dpl, keuchik, kontak_keuchik, posko, kuota)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.nama.trim(),
      entry.skema.trim(),
      entry.kabupaten?.trim() || "Bireuen",
      entry.kecamatan.trim(),
      dpl ? Number(dpl.id) : null,
      dpl ? String(dpl.nama) : dplName,
      entry.keuchik?.trim() || "-",
      entry.kontakKeuchik?.trim() || "-",
      entry.posko.trim(),
      entry.kuota || 15,
    ]
  );
  const row = await mysql.queryOne(`${GAMPONG_SELECT} WHERE g.id = ?`, [result.insertId]);
  if (!row) throw new Error("Gagal menambah gampong.");
  return mapRow(row);
}

export async function updateGampong(id: number, entry: Omit<GampongRecord, "id">): Promise<GampongRecord> {
  const dplName = entry.dpl?.trim() || "Belum Ditentukan";
  const dpl = dplName === "Belum Ditentukan"
    ? undefined
    : await mysql.queryOne("SELECT id, nama FROM dpls WHERE LOWER(nama) = LOWER(?) LIMIT 1", [dplName]);

  await mysql.execute(
    `UPDATE gampongs
     SET nama = ?, skema = ?, kabupaten = ?, kecamatan = ?, dpl_id = ?, dpl = ?, keuchik = ?, kontak_keuchik = ?, posko = ?, kuota = ?
     WHERE id = ?`,
    [
      entry.nama.trim(),
      entry.skema.trim(),
      entry.kabupaten?.trim() || "Bireuen",
      entry.kecamatan.trim(),
      dpl ? Number(dpl.id) : null,
      dpl ? String(dpl.nama) : dplName,
      entry.keuchik?.trim() || "-",
      entry.kontakKeuchik?.trim() || "-",
      entry.posko.trim(),
      entry.kuota || 15,
      id,
    ]
  );

  const row = await mysql.queryOne(`${GAMPONG_SELECT} WHERE g.id = ?`, [id]);
  if (!row) throw new Error("Gampong tidak ditemukan.");
  return mapRow(row);
}

export async function deleteGampong(id: number): Promise<boolean> {
  const result = await mysql.execute("DELETE FROM gampongs WHERE id = ?", [id]);
  return result.affectedRows > 0;
}
