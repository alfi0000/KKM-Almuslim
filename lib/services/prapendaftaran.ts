import { isoDateTime } from "../db-utils";
import { mysql } from "../mysql";

export interface PrapendaftaranSetting {
  tanggalMulai: string | null;
  durasiHari: number;
}

export interface PrapendaftaranPeriode {
  mulai: string | null;
  berakhir: string | null;
  aktif: boolean;
}

export async function getPrapendaftaranSetting(): Promise<PrapendaftaranSetting> {
  const row = await mysql.queryOne(
    "SELECT tanggal_mulai, durasi_hari FROM prapendaftaran_settings WHERE id = 1 LIMIT 1"
  );
  if (!row) return { tanggalMulai: null, durasiHari: 7 };
  return {
    tanggalMulai: isoDateTime(row.tanggal_mulai) || null,
    durasiHari: Number(row.durasi_hari) || 7,
  };
}

export function hitungPeriodePrapendaftaran(setting: PrapendaftaranSetting): PrapendaftaranPeriode {
  if (!setting.tanggalMulai) {
    return { mulai: null, berakhir: null, aktif: false };
  }
  const mulai = new Date(setting.tanggalMulai);
  const berakhir = new Date(mulai.getTime() + setting.durasiHari * 24 * 60 * 60 * 1000);
  const now = new Date();
  return {
    mulai: mulai.toISOString(),
    berakhir: berakhir.toISOString(),
    aktif: now >= mulai && now < berakhir,
  };
}

export async function getPrapendaftaranStatus(): Promise<PrapendaftaranPeriode> {
  const setting = await getPrapendaftaranSetting();
  return hitungPeriodePrapendaftaran(setting);
}

export async function updatePrapendaftaranSetting(
  tanggalMulai: string | null,
  durasiHari: number
): Promise<PrapendaftaranSetting> {
  await mysql.execute(
    `INSERT INTO prapendaftaran_settings (id, tanggal_mulai, durasi_hari)
     VALUES (1, ?, ?)
     ON DUPLICATE KEY UPDATE tanggal_mulai = VALUES(tanggal_mulai), durasi_hari = VALUES(durasi_hari)`,
    [tanggalMulai ? new Date(tanggalMulai) : null, durasiHari]
  );
  return { tanggalMulai, durasiHari };
}

export async function countPendaftarPrapendaftaran(mulaiIso: string | null): Promise<number> {
  const row = mulaiIso
    ? await mysql.queryOne("SELECT COUNT(*) AS total FROM users WHERE created_at >= ?", [new Date(mulaiIso)])
    : await mysql.queryOne("SELECT COUNT(*) AS total FROM users");
  return Number(row?.total) || 0;
}

export async function listPendaftarPrapendaftaran(
  mulaiIso: string | null
): Promise<Array<{ nama: string; npm: string; createdAt: string; diverifikasi: boolean }>> {
  const rows = mulaiIso
    ? await mysql.queryRows(
        "SELECT nama, npm, created_at, diverifikasi FROM users WHERE created_at >= ? ORDER BY created_at DESC LIMIT 500",
        [new Date(mulaiIso)]
      )
    : await mysql.queryRows(
        "SELECT nama, npm, created_at, diverifikasi FROM users ORDER BY created_at DESC LIMIT 500"
      );
  return rows.map((row): { nama: string; npm: string; createdAt: string; diverifikasi: boolean } => ({
    nama: String(row.nama ?? ""),
    npm: String(row.npm ?? ""),
    createdAt: isoDateTime(row.created_at) || "",
    diverifikasi: Boolean(row.diverifikasi),
  }));
}
