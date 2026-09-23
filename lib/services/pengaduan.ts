import { mysql, withMysqlTransaction } from "../mysql";
import { isoDateTime } from "../db-utils";
import { PengaduanRecord } from "../types";

const PENGADUAN_SELECT = `
  SELECT p.id, p.nama_pengadu, p.email, p.telepon, p.kategori, p.judul, p.pesan,
         p.lampiran, p.status, p.tanggapan,
         COALESCE(a.nama, p.assigned_admin) AS assigned_admin,
         p.created_at, p.updated_at
  FROM pengaduan p
  LEFT JOIN admins a ON a.id = p.assigned_admin_id
`;

function mapRow(row: Record<string, unknown>): PengaduanRecord {
  return {
    id: Number(row.id),
    namaPengadu: typeof row.nama_pengadu === "string" ? row.nama_pengadu : undefined,
    email: typeof row.email === "string" ? row.email : undefined,
    telepon: typeof row.telepon === "string" ? row.telepon : undefined,
    kategori: typeof row.kategori === "string" ? row.kategori : undefined,
    judul: String(row.judul ?? ""),
    pesan: String(row.pesan ?? ""),
    lampiran: typeof row.lampiran === "string" ? row.lampiran : undefined,
    status: typeof row.status === "string" ? row.status : undefined,
    tanggapan: typeof row.tanggapan === "string" ? row.tanggapan : undefined,
    assignedAdmin: typeof row.assigned_admin === "string" ? row.assigned_admin : undefined,
    createdAt: isoDateTime(row.created_at),
    updatedAt: isoDateTime(row.updated_at),
  };
}

export async function addPengaduan(payload: {
  namaPengadu?: string;
  email?: string;
  telepon?: string;
  kategori?: string;
  judul: string;
  pesan: string;
  lampiran?: string;
}): Promise<PengaduanRecord> {
  const { namaPengadu, email, telepon, kategori, judul, pesan, lampiran } = payload;
  const result = await mysql.execute(
    `INSERT INTO pengaduan (nama_pengadu, email, telepon, kategori, judul, pesan, lampiran)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [namaPengadu || "Anonim", email || null, telepon || null, kategori || "Informasi", judul, pesan, lampiran || null]
  );
  const row = await mysql.queryOne(`${PENGADUAN_SELECT} WHERE p.id = ?`, [result.insertId]);
  if (!row) throw new Error("Gagal membuat pengaduan.");
  return mapRow(row);
}

export async function getPengaduanList(): Promise<PengaduanRecord[]> {
  const rows = await mysql.queryRows(`${PENGADUAN_SELECT} ORDER BY p.id DESC`);
  return rows.map(mapRow);
}

export async function getPengaduanById(id: number): Promise<PengaduanRecord | undefined> {
  const row = await mysql.queryOne(`${PENGADUAN_SELECT} WHERE p.id = ? LIMIT 1`, [id]);
  return row ? mapRow(row) : undefined;
}

export async function updatePengaduanStatus(id: number, status: string, tanggapan?: string, assignedAdmin?: string) {
  await withMysqlTransaction(async (database) => {
    const adminName = assignedAdmin?.trim() || null;
    const admin = adminName
      ? await database.queryOne(
          "SELECT id, nama FROM admins WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) OR LOWER(nama) = LOWER(?) LIMIT 1",
          [adminName, adminName, adminName]
        )
      : undefined;
    await database.execute(
      "UPDATE pengaduan SET status = ?, tanggapan = ?, assigned_admin_id = ?, assigned_admin = ? WHERE id = ?",
      [status, tanggapan || null, admin ? Number(admin.id) : null, admin ? String(admin.nama) : adminName, id]
    );
  });
}
