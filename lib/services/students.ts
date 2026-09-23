import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { mysql, withMysqlTransaction, type MysqlExecutor, type MysqlRow, type SqlValue } from "../mysql";
import { StudentProfileRecord } from "../types";

const PROFILE_SELECT = `
  SELECT sp.*,
         COALESCE(kp.nama, sp.program, '') AS resolved_program,
         COALESCE(g.nama, sp.gampong, '') AS resolved_gampong,
         COALESCE(d.nama, sp.dpl, '') AS resolved_dpl,
         COALESCE(g.kabupaten, sp.kabupaten, '') AS resolved_kabupaten,
         COALESCE(g.kecamatan, sp.kecamatan, '') AS resolved_kecamatan,
         COALESCE(kg.posko, g.posko, sp.posko, '') AS resolved_posko
  FROM student_profiles sp
  LEFT JOIN kkm_programs kp ON kp.id = sp.program_id
  LEFT JOIN gampongs g ON g.id = sp.gampong_id
  LEFT JOIN dpls d ON d.id = sp.dpl_id
  LEFT JOIN kkm_groups kg ON kg.id = sp.group_id
`;

interface PlacementRelations {
  programId: number | null;
  gampongId: number | null;
  dplId: number | null;
  kabupaten: string;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function rowToProfile(row: MysqlRow): StudentProfileRecord {
  const ipk = row.ipk == null || row.ipk === "" ? "" : Number(row.ipk).toFixed(2);
  return {
    id: Number(row.id),
    nama: String(row.nama ?? ""),
    npm: String(row.npm ?? ""),
    ipk,
    fakultas: String(row.fakultas ?? ""),
    prodi: String(row.prodi ?? ""),
    program: String(row.resolved_program ?? row.program ?? ""),
    kabupaten: String(row.resolved_kabupaten ?? row.kabupaten ?? ""),
    kecamatan: String(row.resolved_kecamatan ?? row.kecamatan ?? ""),
    gampong: String(row.resolved_gampong ?? row.gampong ?? ""),
    dpl: String(row.resolved_dpl ?? row.dpl ?? ""),
    posko: String(row.resolved_posko ?? row.posko ?? ""),
    tanggalDaftar: String(row.tanggal_daftar ?? ""),
    status: String(row.status ?? ""),
    transkrip: optionalString(row.transkrip),
    krs: optionalString(row.krs),
    khs: optionalString(row.khs),
    paspor: optionalString(row.paspor),
    buktiPembayaran: optionalString(row.bukti_pembayaran),
    golonganDarah: optionalString(row.golongan_darah),
    riwayatPenyakit: optionalString(row.riwayat_penyakit),
    noHpMahasiswa: optionalString(row.no_hp_mahasiswa),
    noHpOrtu: optionalString(row.no_hp_ortu),
    alamat: optionalString(row.alamat),
    angkatan: optionalString(row.angkatan),
    lokasi: optionalString(row.lokasi),
    foto: optionalString(row.foto),
    isKetuaKelompok: Number(row.is_ketua_kelompok) || 0,
    tempatLahir: optionalString(row.tempat_lahir),
    tanggalLahir: optionalString(row.tanggal_lahir),
    sksLulus: row.sks_lulus != null ? Number(row.sks_lulus) : undefined,
    sksBelumLulus: row.sks_belum_lulus != null ? Number(row.sks_belum_lulus) : undefined,
    kelasKuliah: optionalString(row.kelas_kuliah),
    statusPerkawinan: optionalString(row.status_perkawinan),
    alamatSekarang: optionalString(row.alamat_sekarang),
    noTelepon: optionalString(row.no_telepon),
    hpOrtuWali: optionalString(row.hp_ortu_wali),
    email: optionalString(row.email),
    kkmSemester: optionalString(row.kkm_semester),
    slipSpp: optionalString(row.slip_spp),
    asuransiJiwa: optionalString(row.asuransi_jiwa),
    slipPembayaran: optionalString(row.slip_pembayaran),
    catatanVerifikasiBerkas: optionalString(row.catatan_verifikasi_berkas),
    updatedAt: optionalString(row.updated_at),
    createdAt: optionalString(row.created_at),
  };
}

async function resolvePlacementRelations(
  database: MysqlExecutor,
  values: { program?: string; gampong?: string; kecamatan?: string; dpl?: string }
): Promise<PlacementRelations> {
  const programName = values.program?.trim();
  const gampongName = values.gampong?.trim();
  const kecamatan = values.kecamatan?.trim();
  const dplName = values.dpl?.trim();

  const [program, gampong, dpl] = await Promise.all([
    programName && programName !== "Belum Ditentukan"
      ? database.queryOne(
          "SELECT id FROM kkm_programs WHERE LOWER(nama) = LOWER(?) OR LOWER(kode) = LOWER(?) LIMIT 1",
          [programName, programName]
        )
      : undefined,
    gampongName && gampongName !== "Belum Ditentukan"
      ? database.queryOne(
          `SELECT id, kabupaten FROM gampongs
           WHERE LOWER(nama) = LOWER(?)
           ORDER BY CASE WHEN LOWER(COALESCE(kecamatan, '')) = LOWER(?) THEN 0 ELSE 1 END, id
           LIMIT 1`,
          [gampongName, kecamatan || ""]
        )
      : undefined,
    dplName && dplName !== "Belum Ditentukan"
      ? database.queryOne("SELECT id FROM dpls WHERE LOWER(nama) = LOWER(?) LIMIT 1", [dplName])
      : undefined,
  ]);

  return {
    programId: program ? Number(program.id) : null,
    gampongId: gampong ? Number(gampong.id) : null,
    dplId: dpl ? Number(dpl.id) : null,
    kabupaten: gampong ? String(gampong.kabupaten ?? "") : "",
  };
}

export async function getProfileByNpm(npm: string): Promise<StudentProfileRecord | undefined> {
  const row = await mysql.queryOne(`${PROFILE_SELECT} WHERE sp.npm = ? LIMIT 1`, [npm.trim()]);
  return row ? rowToProfile(row) : undefined;
}

export async function getAllStudentProfiles(opts?: { limit?: number; offset?: number }): Promise<StudentProfileRecord[]> {
  const limit = opts?.limit ? Math.min(Math.max(Math.floor(opts.limit), 1), 1000) : undefined;
  const offset = opts?.offset ? Math.max(Math.floor(opts.offset), 0) : 0;
  if (limit != null) {
    const rows = await mysql.queryRows(`${PROFILE_SELECT} ORDER BY sp.id DESC LIMIT ? OFFSET ?`, [limit, offset]);
    return rows.map(rowToProfile);
  }
  const rows = await mysql.queryRows(`${PROFILE_SELECT} ORDER BY sp.id DESC`);
  return rows.map(rowToProfile);
}

export async function getStudentProfilesByDpl(dplName: string): Promise<StudentProfileRecord[]> {
  const rows = await mysql.queryRows(
    `${PROFILE_SELECT}
     WHERE LOWER(COALESCE(d.nama, sp.dpl, '')) = LOWER(?)
     ORDER BY sp.id DESC`,
    [dplName.trim()]
  );
  return rows.map(rowToProfile);
}

export async function saveStudentBiodata(
  npm: string,
  payload: {
    nama: string;
    tempatLahir: string;
    tanggalLahir: string;
    fakultas: string;
    prodi: string;
    ipk: string;
    sksLulus: number;
    sksBelumLulus: number;
    kelasKuliah: string;
    statusPerkawinan: string;
    alamatSekarang: string;
    noTelepon: string;
    hpOrtuWali: string;
    email: string;
    kkmSemester: string;
  },
  previousNpm?: string
): Promise<StudentProfileRecord> {
  const targetNpm = npm.trim();
  const sourceNpm = previousNpm?.trim() || targetNpm;

  await withMysqlTransaction(async (database) => {
    const user = await database.queryOne(
      "SELECT id, npm FROM users WHERE npm = ? LIMIT 1 FOR UPDATE",
      [sourceNpm]
    );
    if (!user) throw new Error("Pengguna tidak ditemukan.");

    const existing = await database.queryOne(
      "SELECT * FROM student_profiles WHERE npm = ? LIMIT 1 FOR UPDATE",
      [sourceNpm]
    );

    if (sourceNpm !== targetNpm) {
      const duplicate = await database.queryOne("SELECT id FROM users WHERE npm = ? LIMIT 1", [targetNpm]);
      if (duplicate) throw new Error("NPM baru sudah terdaftar di sistem.");
      await database.execute("UPDATE users SET npm = ? WHERE id = ?", [targetNpm, Number(user.id)]);
    }

    const program = String(existing?.program ?? "KKM Reguler");
    const kecamatan = String(existing?.kecamatan ?? "Belum Ditentukan");
    const gampong = String(existing?.gampong ?? "Belum Ditentukan");
    const dpl = String(existing?.dpl ?? "Belum Ditentukan");
    const relations = await resolvePlacementRelations(database, { program, kecamatan, gampong, dpl });
    const tanggalDaftar = String(
      existing?.tanggal_daftar ??
      new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    );

    await database.execute(
      `INSERT INTO student_profiles
        (nama, npm, fakultas, prodi, ipk, tempat_lahir, tanggal_lahir, sks_lulus,
         sks_belum_lulus, kelas_kuliah, status_perkawinan, alamat_sekarang, no_telepon,
         hp_ortu_wali, email, kkm_semester, program_id, program, gampong_id, gampong,
         kecamatan, dpl_id, dpl, posko, tanggal_daftar, status, alamat, no_hp_mahasiswa, no_hp_ortu)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nama = VALUES(nama), fakultas = VALUES(fakultas), prodi = VALUES(prodi), ipk = VALUES(ipk),
         tempat_lahir = VALUES(tempat_lahir), tanggal_lahir = VALUES(tanggal_lahir),
         sks_lulus = VALUES(sks_lulus), sks_belum_lulus = VALUES(sks_belum_lulus),
         kelas_kuliah = VALUES(kelas_kuliah), status_perkawinan = VALUES(status_perkawinan),
         alamat_sekarang = VALUES(alamat_sekarang), no_telepon = VALUES(no_telepon),
         hp_ortu_wali = VALUES(hp_ortu_wali), email = VALUES(email), kkm_semester = VALUES(kkm_semester),
         alamat = VALUES(alamat), no_hp_mahasiswa = VALUES(no_hp_mahasiswa), no_hp_ortu = VALUES(no_hp_ortu)`,
      [
        payload.nama.trim(), targetNpm, payload.fakultas, payload.prodi, payload.ipk,
        payload.tempatLahir, payload.tanggalLahir || null, payload.sksLulus, payload.sksBelumLulus,
        payload.kelasKuliah, payload.statusPerkawinan, payload.alamatSekarang, payload.noTelepon,
        payload.hpOrtuWali, payload.email, payload.kkmSemester, relations.programId, program,
        relations.gampongId, gampong, kecamatan, relations.dplId, dpl,
        String(existing?.posko ?? "Belum Ditentukan"), tanggalDaftar,
        String(existing?.status ?? "Menunggu Verifikasi"), payload.alamatSekarang,
        payload.noTelepon, payload.hpOrtuWali,
      ]
    );
    await database.execute("UPDATE users SET nama = ? WHERE npm = ?", [payload.nama.trim(), targetNpm]);
  });

  const updated = await getProfileByNpm(targetNpm);
  if (!updated) throw new Error("Gagal menyimpan biodata.");
  return updated;
}

export async function saveMahasiswaBerkas(
  npm: string,
  berkas: {
    slipPembayaran?: string;
    slipSpp?: string;
    transkrip?: string;
    krs?: string;
    pasFoto?: string;
    asuransiJiwa?: string;
  }
): Promise<StudentProfileRecord> {
  const fields: Array<[string, string | undefined]> = [
    ["slip_spp", berkas.slipSpp],
    ["transkrip", berkas.transkrip],
    ["krs", berkas.krs],
    ["foto", berkas.pasFoto],
    ["asuransi_jiwa", berkas.asuransiJiwa],
  ];
  if (berkas.slipPembayaran !== undefined) {
    fields.push(["slip_pembayaran", berkas.slipPembayaran], ["bukti_pembayaran", berkas.slipPembayaran]);
  }

  const updates: string[] = [];
  const values: SqlValue[] = [];
  for (const [column, value] of fields) {
    if (value === undefined) continue;
    updates.push(`${column} = ?`);
    values.push(value || null);
  }
  if (updates.length === 0) {
    const current = await getProfileByNpm(npm);
    if (!current) throw new Error("Profil tidak ditemukan.");
    return current;
  }

  const result = await mysql.execute(
    `UPDATE student_profiles SET ${updates.join(", ")} WHERE npm = ?`,
    [...values, npm.trim()]
  );
  if (result.affectedRows === 0) throw new Error("Profil tidak ditemukan.");
  const updated = await getProfileByNpm(npm);
  if (!updated) throw new Error("Gagal menyimpan berkas.");
  return updated;
}

export async function setStudentProgram(
  npm: string,
  program: string,
  kecamatan: string,
  customDpl?: string,
  transkrip?: string,
  krs?: string,
  khs?: string,
  paspor?: string,
  fakultas?: string,
  foto?: string,
  angkatan?: string,
  lokasi?: string,
  buktiPembayaran?: string,
  customGampong?: string,
  posko?: string
): Promise<StudentProfileRecord> {
  const cleanNpm = npm.trim();
  await withMysqlTransaction(async (database) => {
    const user = await database.queryOne("SELECT nama FROM users WHERE npm = ? LIMIT 1", [cleanNpm]);
    if (!user) throw new Error("Pengguna tidak ditemukan.");
    const existing = await database.queryOne("SELECT * FROM student_profiles WHERE npm = ? LIMIT 1", [cleanNpm]);
    const gampong = customGampong?.trim() || "";
    const dpl = customDpl?.trim() || "";
    const relations = await resolvePlacementRelations(database, { program, kecamatan, gampong, dpl });
    const tanggalDaftar = String(
      existing?.tanggal_daftar ??
      new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    );

    await database.execute(
      `INSERT INTO student_profiles
        (nama, npm, ipk, fakultas, prodi, program_id, program, kecamatan, gampong_id,
         gampong, dpl_id, dpl, posko, tanggal_daftar, status, transkrip, krs, khs,
         paspor, bukti_pembayaran, foto, angkatan, lokasi)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         program_id = VALUES(program_id), program = VALUES(program), kecamatan = VALUES(kecamatan),
         gampong_id = VALUES(gampong_id), gampong = VALUES(gampong), dpl_id = VALUES(dpl_id),
         dpl = VALUES(dpl), posko = VALUES(posko), transkrip = VALUES(transkrip), krs = VALUES(krs),
         khs = VALUES(khs), paspor = VALUES(paspor), bukti_pembayaran = VALUES(bukti_pembayaran),
         fakultas = VALUES(fakultas), foto = VALUES(foto), angkatan = VALUES(angkatan), lokasi = VALUES(lokasi)`,
      [
        String(user.nama), cleanNpm, existing?.ipk ?? null, fakultas || existing?.fakultas || "",
        existing?.prodi ?? "", relations.programId, program, kecamatan, relations.gampongId,
        gampong, relations.dplId, dpl, posko || String(existing?.posko ?? ""), tanggalDaftar,
        String(existing?.status ?? "Menunggu Verifikasi"), transkrip || existing?.transkrip || null,
        krs || existing?.krs || null, khs || existing?.khs || null, paspor || existing?.paspor || null,
        buktiPembayaran || existing?.bukti_pembayaran || null, foto || existing?.foto || null,
        angkatan || existing?.angkatan || null, lokasi || existing?.lokasi || null,
      ]
    );
  });

  const profile = await getProfileByNpm(cleanNpm);
  if (!profile) throw new Error("Gagal menyimpan program mahasiswa.");
  return profile;
}

export async function updateStudentProfileDetails(
  npm: string,
  nama: string,
  foto?: string,
  golonganDarah?: string,
  riwayatPenyakit?: string,
  noHpMahasiswa?: string,
  noHpOrtu?: string,
  alamat?: string
): Promise<StudentProfileRecord> {
  const cleanNpm = npm.trim();
  await withMysqlTransaction(async (database) => {
    const user = await database.queryOne("SELECT id FROM users WHERE npm = ? LIMIT 1 FOR UPDATE", [cleanNpm]);
    if (!user) throw new Error("Profil tidak ditemukan.");
    const tanggalDaftar = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    await database.execute(
      `INSERT INTO student_profiles
        (nama, npm, ipk, fakultas, prodi, program, kecamatan, gampong, dpl, posko, tanggal_daftar, status)
       VALUES (?, ?, 3.75, 'Fakultas Ilmu Komputer (FIKOM)', 'Informatika', 'Belum Ditentukan',
               'Belum Ditentukan', 'Belum Ditentukan', 'Belum Ditentukan', 'Belum Ditentukan', ?,
               'Belum Terverifikasi / Aktif')
       ON DUPLICATE KEY UPDATE nama = VALUES(nama)`,
      [nama.trim(), cleanNpm, tanggalDaftar]
    );
    await database.execute(
      `UPDATE student_profiles
       SET nama = ?, foto = ?, golongan_darah = ?, riwayat_penyakit = ?,
           no_hp_mahasiswa = ?, no_hp_ortu = ?, alamat = ?
       WHERE npm = ?`,
      [nama.trim(), foto || null, golonganDarah || null, riwayatPenyakit || null, noHpMahasiswa || null, noHpOrtu || null, alamat || null, cleanNpm]
    );
    await database.execute("UPDATE users SET nama = ? WHERE npm = ?", [nama.trim(), cleanNpm]);
  });

  const profile = await getProfileByNpm(cleanNpm);
  if (!profile) throw new Error("Gagal memperbarui profil.");
  return profile;
}

export async function setStudentKetuaKelompokStatus(npm: string, isKetua: number): Promise<void> {
  const cleanNpm = npm.trim();
  const leader = isKetua === 1 ? 1 : 0;
  await withMysqlTransaction(async (database) => {
    const profile = await database.queryOne(
      "SELECT id, group_id FROM student_profiles WHERE npm = ? LIMIT 1 FOR UPDATE",
      [cleanNpm]
    );
    if (!profile) throw new Error("Mahasiswa tidak ditemukan.");

    if (profile.group_id != null) {
      const groupId = Number(profile.group_id);
      if (leader === 1) {
        await database.execute(
          "UPDATE kkm_group_members SET peran = 'Anggota' WHERE group_id = ? AND peran = 'Ketua' AND status = 'Aktif'",
          [groupId]
        );
        await database.execute(
          `INSERT INTO kkm_group_members (group_id, student_profile_id, peran, status)
           VALUES (?, ?, 'Ketua', 'Aktif')
           ON DUPLICATE KEY UPDATE peran = 'Ketua', status = 'Aktif'`,
          [groupId, Number(profile.id)]
        );
        await database.execute("UPDATE student_profiles SET is_ketua_kelompok = 0 WHERE group_id = ?", [groupId]);
      } else {
        await database.execute(
          "UPDATE kkm_group_members SET peran = 'Anggota' WHERE group_id = ? AND student_profile_id = ?",
          [groupId, Number(profile.id)]
        );
      }
    }
    await database.execute("UPDATE student_profiles SET is_ketua_kelompok = ? WHERE id = ?", [leader, Number(profile.id)]);
  });
}

export async function hasOtherKetuaKelompok(gampong: string, excludeNpm: string): Promise<boolean> {
  const cleanGampong = gampong.trim();
  if (!cleanGampong) return false;
  const row = await mysql.queryOne(
    `SELECT 1 AS found
     FROM student_profiles sp
     LEFT JOIN gampongs g ON g.id = sp.gampong_id
     WHERE LOWER(COALESCE(g.nama, sp.gampong, '')) = LOWER(?)
       AND sp.is_ketua_kelompok = 1 AND sp.npm <> ?
     LIMIT 1`,
    [cleanGampong, excludeNpm.trim()]
  );
  return Boolean(row);
}

export async function deleteStudent(npm: string): Promise<boolean> {
  const result = await mysql.execute("DELETE FROM users WHERE npm = ?", [npm.trim()]);
  return result.affectedRows > 0;
}

export async function addOrUpdateStudentFromAdmin(
  nama: string,
  npm: string,
  password?: string,
  fakultas?: string,
  prodi?: string,
  program?: string,
  kecamatan?: string,
  gampong?: string,
  angkatan?: string,
  lokasi?: string,
  dpl?: string,
  posko?: string,
  ipk?: string
): Promise<StudentProfileRecord> {
  const cleanNpm = npm.trim();
  const cleanNama = nama.trim();
  const plainPassword = password?.trim() || crypto.randomBytes(24).toString("base64url");
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  const tanggalDaftar = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  await withMysqlTransaction(async (database) => {
    const user = await database.queryOne("SELECT id FROM users WHERE npm = ? LIMIT 1 FOR UPDATE", [cleanNpm]);
    if (user) {
      if (password) {
        await database.execute("UPDATE users SET nama = ?, password = ?, diverifikasi = TRUE WHERE id = ?", [cleanNama, passwordHash, Number(user.id)]);
      } else {
        await database.execute("UPDATE users SET nama = ?, diverifikasi = TRUE WHERE id = ?", [cleanNama, Number(user.id)]);
      }
    } else {
      await database.execute(
        "INSERT INTO users (nama, npm, password, diverifikasi) VALUES (?, ?, ?, TRUE)",
        [cleanNama, cleanNpm, passwordHash]
      );
    }

    const relations = await resolvePlacementRelations(database, { program, kecamatan, gampong, dpl });
    await database.execute(
      `INSERT INTO student_profiles
        (nama, npm, ipk, fakultas, prodi, program_id, program, kecamatan, gampong_id,
         gampong, kabupaten, dpl_id, dpl, posko, tanggal_daftar, status, angkatan, lokasi)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Terverifikasi / Aktif', ?, ?)
       ON DUPLICATE KEY UPDATE
         nama = VALUES(nama), ipk = VALUES(ipk), fakultas = VALUES(fakultas), prodi = VALUES(prodi),
         program_id = VALUES(program_id), program = VALUES(program), kabupaten = VALUES(kabupaten), kecamatan = VALUES(kecamatan),
         gampong_id = VALUES(gampong_id), gampong = VALUES(gampong), dpl_id = VALUES(dpl_id),
         dpl = VALUES(dpl), posko = VALUES(posko), status = VALUES(status),
         angkatan = VALUES(angkatan), lokasi = VALUES(lokasi)`,
      [
        cleanNama, cleanNpm, ipk || null, fakultas || "", prodi || "", relations.programId,
        program || "", kecamatan || "", relations.gampongId, gampong || "", relations.kabupaten, relations.dplId,
        dpl || "", posko || "", tanggalDaftar, angkatan || null, lokasi || null,
      ]
    );
  });

  const profile = await getProfileByNpm(cleanNpm);
  if (!profile) throw new Error("Gagal menyimpan mahasiswa.");
  return profile;
}

export async function setStudentVerificationStatus(
  npm: string,
  status: string,
  catatanVerifikasiBerkas?: string,
  updateAccountVerification = true
): Promise<StudentProfileRecord | undefined> {
  const cleanNpm = npm.trim();
  await withMysqlTransaction(async (database) => {
    const profile = await database.queryOne(
      "SELECT id, period_id, status FROM student_profiles WHERE npm = ? LIMIT 1 FOR UPDATE",
      [cleanNpm]
    );
    if (!profile) return;
    const note = catatanVerifikasiBerkas?.trim() || null;
    await database.execute(
      "UPDATE student_profiles SET status = ?, catatan_verifikasi_berkas = ? WHERE id = ?",
      [status, note, Number(profile.id)]
    );
    if (updateAccountVerification) {
      await database.execute("UPDATE users SET diverifikasi = ? WHERE npm = ?", [status === "Terverifikasi", cleanNpm]);
    }
    await database.execute(
      `INSERT INTO kkm_status_history
        (period_id, entity_type, entity_id, student_profile_id, status_lama, status_baru,
         catatan, actor_role, actor_identifier)
       VALUES (?, 'Mahasiswa', ?, ?, ?, ?, ?, 'Admin', NULL)`,
      [profile.period_id == null ? null : Number(profile.period_id), Number(profile.id), Number(profile.id), optionalString(profile.status) || null, status, note]
    );
  });
  return getProfileByNpm(cleanNpm);
}

export async function updateVerifiedStudentPlacement(
  npm: string,
  placement: { gampong: string; dpl: string; kecamatan: string; posko: string }
): Promise<StudentProfileRecord | undefined> {
  const cleanNpm = npm.trim();
  await withMysqlTransaction(async (database) => {
    const relations = await resolvePlacementRelations(database, placement);
    await database.execute(
      `UPDATE student_profiles
       SET gampong_id = ?, gampong = ?, kabupaten = ?, dpl_id = ?, dpl = ?, kecamatan = ?, posko = ?
       WHERE npm = ?`,
      [relations.gampongId, placement.gampong.trim(), relations.kabupaten, relations.dplId, placement.dpl.trim(), placement.kecamatan.trim(), placement.posko.trim(), cleanNpm]
    );
  });
  return getProfileByNpm(cleanNpm);
}

export interface AnggotaGampong {
  npm: string;
  nama: string;
  prodi: string;
  fakultas: string;
  kkmSemester: string;
  isKetua: boolean;
}

export async function getAnggotaByGampong(
  gampong: string,
  excludeNpm?: string,
  kkmSemester?: string
): Promise<AnggotaGampong[]> {
  const cleanGampong = gampong.trim();
  if (!cleanGampong) return [];
  const excluded = excludeNpm?.trim() || null;
  // Hanya satu gampong + satu semester KKM yang sama, jangan dicampur.
  // Jika semester kosong, fallback ke filter gampong saja.
  const semesterFilter = kkmSemester?.trim() || null;
  const rows = await mysql.queryRows(
    `SELECT sp.npm, sp.nama, sp.prodi, sp.fakultas, sp.is_ketua_kelompok, sp.kkm_semester
     FROM student_profiles sp
     LEFT JOIN gampongs g ON g.id = sp.gampong_id
     WHERE LOWER(COALESCE(g.nama, sp.gampong, '')) = LOWER(?)
       AND (? IS NULL OR sp.npm <> ?)
       AND (? IS NULL OR LOWER(TRIM(COALESCE(sp.kkm_semester, ''))) = LOWER(TRIM(?)))
     ORDER BY sp.is_ketua_kelompok DESC, sp.nama ASC`,
    [cleanGampong, excluded, excluded || "", semesterFilter, semesterFilter || ""]
  );
  return rows.map((row) => ({
    npm: String(row.npm ?? ""),
    nama: String(row.nama ?? ""),
    prodi: String(row.prodi ?? ""),
    fakultas: String(row.fakultas ?? ""),
    kkmSemester: String(row.kkm_semester ?? ""),
    isKetua: Number(row.is_ketua_kelompok) === 1,
  }));
}
