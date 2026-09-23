import { connectMysql, getDatabaseName } from "./connection.mjs";

const expectedTables = [
  "admins", "berita", "berkas_upload_settings", "dokumen", "dpls", "gampongs",
  "kkm_group_members", "kkm_groups", "kkm_periods", "kkm_programs", "kkm_status_history",
  "laporans", "logbooks", "logbook_week_settings", "lppm", "lppm_struktur", "otp_codes", "pengaduan",
  "prapendaftaran_settings", "profile_edit_settings", "student_documents", "student_profiles", "timeline", "users",
];

const expectedForeignKeys = [
  "gampongs_dpl_fk", "kkm_groups_period_fk", "kkm_groups_gampong_fk", "kkm_groups_dpl_fk",
  "student_profiles_user_fk", "student_profiles_period_fk", "student_profiles_program_fk",
  "student_profiles_group_fk", "student_profiles_gampong_fk", "student_profiles_dpl_fk",
  "kkm_group_members_group_fk", "kkm_group_members_student_fk", "logbooks_student_fk",
  "laporans_student_fk", "student_documents_profile_fk", "student_documents_period_fk",
  "pengaduan_admin_fk", "kkm_status_history_period_fk", "kkm_status_history_student_fk",
  "kkm_status_history_logbook_fk", "kkm_status_history_laporan_fk",
  "kkm_status_history_document_fk", "kkm_status_history_group_fk", "kkm_status_history_pengaduan_fk",
];

const connection = await connectMysql();
const database = getDatabaseName();
try {
  const [tableRows] = await connection.execute(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = ?",
    [database]
  );
  const [constraintRows] = await connection.execute(
    `SELECT constraint_name
     FROM information_schema.referential_constraints
     WHERE constraint_schema = ?`,
    [database]
  );
  const tables = new Set(tableRows.map((row) => row.TABLE_NAME || row.table_name));
  const foreignKeys = new Set(constraintRows.map((row) => row.CONSTRAINT_NAME || row.constraint_name));
  const missingTables = expectedTables.filter((table) => !tables.has(table));
  const [logbookColumns] = await connection.execute(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'logbooks' AND column_name = 'minggu'`,
    [database]
  );
  const missingForeignKeys = expectedForeignKeys.filter((key) => !foreignKeys.has(key));
  if (missingTables.length || missingForeignKeys.length || logbookColumns.length === 0) {
    if (missingTables.length) console.error(`Tabel hilang: ${missingTables.join(", ")}`);
    if (missingForeignKeys.length) console.error(`Foreign key hilang: ${missingForeignKeys.join(", ")}`);
    if (logbookColumns.length === 0) console.error("Kolom logbooks.minggu hilang.");
    process.exitCode = 1;
  } else {
    console.log(`Skema valid: ${expectedTables.length} tabel dan ${expectedForeignKeys.length} foreign key tersedia.`);
  }
} finally {
  await connection.end();
}
