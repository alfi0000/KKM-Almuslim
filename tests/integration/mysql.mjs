import { connectMysql } from "../../scripts/mysql/connection.mjs";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function scalar(connection, sql, values = []) {
  const [rows] = await connection.execute(sql, values);
  return Number(Object.values(rows[0] || {})[0] || 0);
}

async function expectMysqlError(action, expectedCode, message) {
  try {
    await action();
  } catch (error) {
    if (error?.code === expectedCode) return;
    throw error;
  }
  throw new Error(message);
}

const connection = await connectMysql();

try {
  await connection.beginTransaction();

  const suffix = `${Date.now()}_${process.pid}`;
  const oldNpm = `QA_OLD_${suffix}`;
  const newNpm = `QA_NEW_${suffix}`;
  const secondNpm = `QA_MEMBER_${suffix}`;

  const [programRows] = await connection.execute(
    "SELECT id FROM kkm_programs WHERE kode = 'REGULER' LIMIT 1"
  );
  assert(programRows.length === 1, "Program REGULER tidak tersedia.");
  const programId = programRows[0].id;

  const [periodResult] = await connection.execute(
    `INSERT INTO kkm_periods (kode, nama, tahun_akademik, semester, status)
     VALUES (?, ?, '2026/2027', 'Ganjil', 'Berjalan')`,
    [`QA_PERIOD_${suffix}`, `Periode QA ${suffix}`]
  );
  const periodId = periodResult.insertId;

  const [dplResult] = await connection.execute(
    "INSERT INTO dpls (nama, nidn) VALUES (?, ?)",
    [`DPL QA ${suffix}`, `QA_NIDN_${suffix}`]
  );
  const dplId = dplResult.insertId;

  const [gampongResult] = await connection.execute(
    `INSERT INTO gampongs (nama, kecamatan, dpl_id, dpl, posko, kuota)
     VALUES (?, 'Peusangan', ?, ?, 'Posko QA', 25)`,
    [`Gampong QA ${suffix}`, dplId, `DPL QA ${suffix}`]
  );
  const gampongId = gampongResult.insertId;

  const [groupResult] = await connection.execute(
    `INSERT INTO kkm_groups (period_id, gampong_id, dpl_id, nama, posko, kuota, status)
     VALUES (?, ?, ?, ?, 'Posko QA', 25, 'Aktif')`,
    [periodId, gampongId, dplId, `Kelompok QA ${suffix}`]
  );
  const groupId = groupResult.insertId;

  await expectMysqlError(
    () =>
      connection.execute(
        "INSERT INTO student_profiles (npm, nama) VALUES (?, 'Orphan QA')",
        [`QA_ORPHAN_${suffix}`]
      ),
    "ER_NO_REFERENCED_ROW_2",
    "Foreign key student_profiles -> users tidak menolak data yatim."
  );

  await connection.execute(
    "INSERT INTO users (nama, npm, diverifikasi, phone) VALUES (?, ?, TRUE, ?)",
    [`Mahasiswa QA ${suffix}`, oldNpm, `62811${String(Date.now()).slice(-8)}`]
  );
  await connection.execute(
    "INSERT INTO users (nama, npm, diverifikasi) VALUES (?, ?, TRUE)",
    [`Anggota QA ${suffix}`, secondNpm]
  );

  const [profileResult] = await connection.execute(
    `INSERT INTO student_profiles
       (npm, nama, program_id, program, period_id, group_id, gampong_id, gampong,
        kecamatan, dpl_id, dpl, posko, status, is_ketua_kelompok)
     VALUES (?, ?, ?, 'KKM Reguler', ?, ?, ?, ?, 'Peusangan', ?, ?, 'Posko QA', 'Terverifikasi', TRUE)`,
    [
      oldNpm,
      `Mahasiswa QA ${suffix}`,
      programId,
      periodId,
      groupId,
      gampongId,
      `Gampong QA ${suffix}`,
      dplId,
      `DPL QA ${suffix}`,
    ]
  );
  const profileId = profileResult.insertId;

  const [secondProfileResult] = await connection.execute(
    `INSERT INTO student_profiles
       (npm, nama, program_id, period_id, group_id, gampong_id, dpl_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Terverifikasi')`,
    [secondNpm, `Anggota QA ${suffix}`, programId, periodId, groupId, gampongId, dplId]
  );
  const secondProfileId = secondProfileResult.insertId;

  await connection.execute(
    `INSERT INTO kkm_group_members (group_id, student_profile_id, peran, status)
     VALUES (?, ?, 'Ketua', 'Aktif')`,
    [groupId, profileId]
  );
  await expectMysqlError(
    () =>
      connection.execute(
        `INSERT INTO kkm_group_members (group_id, student_profile_id, peran, status)
         VALUES (?, ?, 'Ketua', 'Aktif')`,
        [groupId, secondProfileId]
      ),
    "ER_DUP_ENTRY",
    "Relasi kelompok menerima lebih dari satu ketua aktif."
  );
  await connection.execute(
    `INSERT INTO kkm_group_members (group_id, student_profile_id, peran, status)
     VALUES (?, ?, 'Anggota', 'Aktif')`,
    [groupId, secondProfileId]
  );

  const [logbookResult] = await connection.execute(
    `INSERT INTO logbooks (npm, tanggal, judul, status)
     VALUES (?, '2026-09-02', 'Logbook QA', 'Disetujui')`,
    [oldNpm]
  );
  const logbookId = logbookResult.insertId;

  const [laporanResult] = await connection.execute(
    `INSERT INTO laporans (npm, jenis, nama_file, file_url, file_size, status)
     VALUES (?, 'Laporan Akhir', 'qa.pdf', 'https://example.invalid/qa.pdf', 1024, 'Disetujui')`,
    [oldNpm]
  );
  const laporanId = laporanResult.insertId;

  const [documentResult] = await connection.execute(
    `INSERT INTO student_documents
       (student_profile_id, period_id, jenis, nama_file, file_url, file_size, status)
     VALUES (?, ?, 'KRS', 'qa.pdf', 'https://example.invalid/qa.pdf', 1024, 'Disetujui')`,
    [profileId, periodId]
  );
  const documentId = documentResult.insertId;

  await connection.execute(
    `INSERT INTO kkm_status_history
       (period_id, entity_type, entity_id, student_profile_id, logbook_id, laporan_id,
        student_document_id, group_id, status_baru, actor_role)
     VALUES (?, 'Mahasiswa', ?, ?, ?, ?, ?, ?, 'Terverifikasi', 'Sistem')`,
    [periodId, profileId, profileId, logbookId, laporanId, documentId, groupId]
  );

  await connection.execute("UPDATE users SET npm = ? WHERE npm = ?", [newNpm, oldNpm]);
  assert(
    (await scalar(connection, "SELECT COUNT(*) AS total FROM student_profiles WHERE npm = ?", [newNpm])) === 1,
    "Perubahan NPM tidak diteruskan ke student_profiles."
  );
  assert(
    (await scalar(connection, "SELECT COUNT(*) AS total FROM logbooks WHERE npm = ?", [newNpm])) === 1,
    "Perubahan NPM tidak diteruskan ke logbooks."
  );
  assert(
    (await scalar(connection, "SELECT COUNT(*) AS total FROM laporans WHERE npm = ?", [newNpm])) === 1,
    "Perubahan NPM tidak diteruskan ke laporans."
  );

  await connection.execute("DELETE FROM users WHERE npm = ?", [newNpm]);
  for (const table of ["student_profiles", "logbooks", "laporans", "student_documents"]) {
    assert(
      (await scalar(connection, `SELECT COUNT(*) AS total FROM ${table} WHERE id = ?`, [
        table === "student_profiles" ? profileId :
          table === "logbooks" ? logbookId :
            table === "laporans" ? laporanId : documentId,
      ])) === 0,
      `Cascade delete gagal pada ${table}.`
    );
  }
  assert(
    (await scalar(
      connection,
      "SELECT COUNT(*) AS total FROM kkm_status_history WHERE entity_id = ? AND student_profile_id IS NULL AND logbook_id IS NULL AND laporan_id IS NULL AND student_document_id IS NULL",
      [profileId]
    )) === 1,
    "Riwayat status tidak dipertahankan dengan relasi nullable setelah data sumber dihapus."
  );

  await connection.execute("DELETE FROM dpls WHERE id = ?", [dplId]);
  assert(
    (await scalar(connection, "SELECT COUNT(*) AS total FROM gampongs WHERE id = ? AND dpl_id IS NULL", [gampongId])) === 1,
    "ON DELETE SET NULL gagal pada gampongs.dpl_id."
  );
  assert(
    (await scalar(connection, "SELECT COUNT(*) AS total FROM kkm_groups WHERE id = ? AND dpl_id IS NULL", [groupId])) === 1,
    "ON DELETE SET NULL gagal pada kkm_groups.dpl_id."
  );

  await connection.rollback();
  console.log("Integrasi MySQL valid: FK, CHECK, UNIQUE, CASCADE, SET NULL, dan transaksi lulus.");
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
