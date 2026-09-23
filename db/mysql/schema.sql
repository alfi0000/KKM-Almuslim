SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama VARCHAR(255) NOT NULL,
  npm VARCHAR(64) NOT NULL,
  password VARCHAR(255) NULL,
  diverifikasi BOOLEAN NOT NULL DEFAULT FALSE,
  phone VARCHAR(20) NULL,
  no_hp VARCHAR(20) NULL,
  phone_canonical VARCHAR(20) GENERATED ALWAYS AS (COALESCE(NULLIF(phone, ''), NULLIF(no_hp, ''))) STORED,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY users_npm_uq (npm),
  UNIQUE KEY users_phone_canonical_uq (phone_canonical)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama VARCHAR(255) NULL,
  username VARCHAR(128) NULL,
  email VARCHAR(255) NULL,
  password VARCHAR(255) NULL,
  role VARCHAR(64) NULL DEFAULT 'admin',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY admins_username_uq (username),
  UNIQUE KEY admins_email_uq (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lppm (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama VARCHAR(255) NOT NULL,
  username VARCHAR(128) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(64) NOT NULL DEFAULT 'lppm',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY lppm_username_uq (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dpls (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama VARCHAR(255) NOT NULL,
  nidn VARCHAR(128) NOT NULL,
  password VARCHAR(255) NULL,
  fakultas VARCHAR(255) NULL,
  skema VARCHAR(255) NULL,
  kecamatan VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  no_hp VARCHAR(64) NULL,
  alamat TEXT NULL,
  foto VARCHAR(512) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY dpls_nidn_uq (nidn),
  KEY dpls_nama_idx (nama)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kkm_periods (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kode VARCHAR(64) NOT NULL,
  nama VARCHAR(160) NOT NULL,
  tahun_akademik VARCHAR(32) NOT NULL,
  semester VARCHAR(16) NOT NULL,
  pendaftaran_mulai DATETIME(3) NULL,
  pendaftaran_berakhir DATETIME(3) NULL,
  pelaksanaan_mulai DATE NULL,
  pelaksanaan_berakhir DATE NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'Draft',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY kkm_periods_kode_uq (kode),
  CONSTRAINT kkm_periods_semester_chk CHECK (semester IN ('Ganjil', 'Genap', 'Pendek')),
  CONSTRAINT kkm_periods_status_chk CHECK (status IN ('Draft', 'Pendaftaran', 'Berjalan', 'Selesai', 'Diarsipkan')),
  CONSTRAINT kkm_periods_registration_dates_chk CHECK (
    pendaftaran_berakhir IS NULL OR pendaftaran_mulai IS NULL OR pendaftaran_berakhir > pendaftaran_mulai
  ),
  CONSTRAINT kkm_periods_execution_dates_chk CHECK (
    pelaksanaan_berakhir IS NULL OR pelaksanaan_mulai IS NULL OR pelaksanaan_berakhir >= pelaksanaan_mulai
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kkm_programs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kode VARCHAR(64) NOT NULL,
  nama VARCHAR(160) NOT NULL,
  aktif BOOLEAN NOT NULL DEFAULT TRUE,
  requires_paspor BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY kkm_programs_kode_uq (kode),
  UNIQUE KEY kkm_programs_nama_uq (nama)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gampongs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama VARCHAR(255) NOT NULL,
  skema VARCHAR(255) NULL,
  kabupaten VARCHAR(255) NULL,
  kecamatan VARCHAR(255) NULL,
  dpl_id BIGINT UNSIGNED NULL,
  dpl VARCHAR(255) NULL,
  keuchik VARCHAR(255) NULL,
  kontak_keuchik VARCHAR(255) NULL,
  posko VARCHAR(255) NULL,
  kuota INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY gampongs_nama_kecamatan_uq (nama, kecamatan),
  KEY gampongs_dpl_idx (dpl_id),
  CONSTRAINT gampongs_dpl_fk FOREIGN KEY (dpl_id) REFERENCES dpls (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kkm_groups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  period_id BIGINT UNSIGNED NOT NULL,
  gampong_id BIGINT UNSIGNED NOT NULL,
  dpl_id BIGINT UNSIGNED NULL,
  nama VARCHAR(160) NOT NULL,
  posko VARCHAR(255) NULL,
  kuota INT UNSIGNED NOT NULL DEFAULT 0,
  status VARCHAR(24) NOT NULL DEFAULT 'Aktif',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY kkm_groups_period_gampong_nama_uq (period_id, gampong_id, nama),
  KEY kkm_groups_gampong_idx (gampong_id),
  KEY kkm_groups_dpl_idx (dpl_id),
  CONSTRAINT kkm_groups_period_fk FOREIGN KEY (period_id) REFERENCES kkm_periods (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT kkm_groups_gampong_fk FOREIGN KEY (gampong_id) REFERENCES gampongs (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT kkm_groups_dpl_fk FOREIGN KEY (dpl_id) REFERENCES dpls (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT kkm_groups_status_chk CHECK (status IN ('Draft', 'Aktif', 'Selesai', 'Diarsipkan'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  npm VARCHAR(64) NOT NULL,
  nama VARCHAR(255) NOT NULL,
  ipk DECIMAL(4,2) NULL,
  fakultas VARCHAR(255) NULL,
  prodi VARCHAR(255) NULL,
  program_id BIGINT UNSIGNED NULL,
  program VARCHAR(255) NULL,
  period_id BIGINT UNSIGNED NULL,
  group_id BIGINT UNSIGNED NULL,
  gampong_id BIGINT UNSIGNED NULL,
  gampong VARCHAR(255) NULL,
  kabupaten VARCHAR(255) NULL,
  kecamatan VARCHAR(255) NULL,
  dpl_id BIGINT UNSIGNED NULL,
  dpl VARCHAR(255) NULL,
  posko VARCHAR(255) NULL,
  tanggal_daftar VARCHAR(255) NULL,
  status VARCHAR(128) NULL,
  transkrip TEXT NULL,
  krs TEXT NULL,
  khs TEXT NULL,
  paspor TEXT NULL,
  bukti_pembayaran TEXT NULL,
  golongan_darah VARCHAR(64) NULL,
  riwayat_penyakit TEXT NULL,
  no_hp_mahasiswa VARCHAR(64) NULL,
  no_hp_ortu VARCHAR(64) NULL,
  alamat TEXT NULL,
  angkatan VARCHAR(50) NULL,
  lokasi VARCHAR(255) NULL,
  foto VARCHAR(512) NULL,
  is_ketua_kelompok TINYINT(1) NOT NULL DEFAULT 0,
  tempat_lahir VARCHAR(255) NULL,
  tanggal_lahir DATE NULL,
  sks_lulus SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  sks_belum_lulus SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  kelas_kuliah VARCHAR(32) NULL,
  status_perkawinan VARCHAR(32) NULL,
  catatan_verifikasi_berkas TEXT NULL,
  alamat_sekarang TEXT NULL,
  no_telepon VARCHAR(20) NULL,
  hp_ortu_wali VARCHAR(20) NULL,
  email VARCHAR(255) NULL,
  kkm_semester VARCHAR(16) NULL,
  slip_spp TEXT NULL,
  asuransi_jiwa TEXT NULL,
  slip_pembayaran TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY student_profiles_npm_uq (npm),
  KEY student_profiles_period_idx (period_id),
  KEY student_profiles_program_idx (program_id),
  KEY student_profiles_group_idx (group_id),
  KEY student_profiles_gampong_dpl_idx (gampong_id, dpl_id),
  CONSTRAINT student_profiles_user_fk FOREIGN KEY (npm) REFERENCES users (npm)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT student_profiles_period_fk FOREIGN KEY (period_id) REFERENCES kkm_periods (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT student_profiles_program_fk FOREIGN KEY (program_id) REFERENCES kkm_programs (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT student_profiles_group_fk FOREIGN KEY (group_id) REFERENCES kkm_groups (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT student_profiles_gampong_fk FOREIGN KEY (gampong_id) REFERENCES gampongs (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT student_profiles_dpl_fk FOREIGN KEY (dpl_id) REFERENCES dpls (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT student_profiles_leader_chk CHECK (is_ketua_kelompok IN (0, 1)),
  CONSTRAINT student_profiles_semester_chk CHECK (kkm_semester IS NULL OR kkm_semester IN ('Ganjil', 'Genap'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE gampongs ADD COLUMN kabupaten VARCHAR(255) NULL AFTER skema;
ALTER TABLE student_profiles ADD COLUMN kabupaten VARCHAR(255) NULL AFTER gampong;

CREATE TABLE IF NOT EXISTS kkm_group_members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NOT NULL,
  student_profile_id BIGINT UNSIGNED NOT NULL,
  peran VARCHAR(16) NOT NULL DEFAULT 'Anggota',
  status VARCHAR(24) NOT NULL DEFAULT 'Aktif',
  active_leader TINYINT UNSIGNED GENERATED ALWAYS AS (
    CASE WHEN peran = 'Ketua' AND status = 'Aktif' THEN 1 ELSE NULL END
  ) STORED,
  ditetapkan_pada DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY kkm_group_members_group_student_uq (group_id, student_profile_id),
  UNIQUE KEY kkm_group_members_active_leader_uq (group_id, active_leader),
  KEY kkm_group_members_student_idx (student_profile_id),
  CONSTRAINT kkm_group_members_group_fk FOREIGN KEY (group_id) REFERENCES kkm_groups (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT kkm_group_members_student_fk FOREIGN KEY (student_profile_id) REFERENCES student_profiles (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT kkm_group_members_role_chk CHECK (peran IN ('Ketua', 'Anggota')),
  CONSTRAINT kkm_group_members_status_chk CHECK (status IN ('Aktif', 'Pindah', 'Mengundurkan Diri', 'Selesai'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS logbooks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  npm VARCHAR(64) NOT NULL,
  tanggal VARCHAR(255) NULL,
  judul TEXT NULL,
  lokasi TEXT NULL,
  deskripsi TEXT NULL,
  foto VARCHAR(512) NULL,
  foto_2 VARCHAR(512) NULL,
  capaian_akhir TEXT NULL,
  status VARCHAR(64) NULL DEFAULT 'Menunggu Verifikasi',
  catatan_dpl TEXT NULL,
  kategori VARCHAR(128) NULL,
  minggu TINYINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY logbooks_npm_created_idx (npm, created_at DESC),
  CONSTRAINT logbooks_student_fk FOREIGN KEY (npm) REFERENCES student_profiles (npm)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE logbooks ADD COLUMN minggu TINYINT UNSIGNED NULL AFTER kategori;
ALTER TABLE logbooks ADD COLUMN foto_2 VARCHAR(512) NULL AFTER foto;
ALTER TABLE logbooks ADD COLUMN capaian_akhir TEXT NULL AFTER deskripsi;
UPDATE logbooks SET minggu = 1 WHERE minggu IS NULL;

CREATE TABLE IF NOT EXISTS laporans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  npm VARCHAR(64) NOT NULL,
  jenis VARCHAR(128) NULL,
  nama_file TEXT NULL,
  file_url TEXT NULL,
  file_type VARCHAR(128) NULL,
  file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
  tanggal_upload VARCHAR(255) NULL,
  status VARCHAR(64) NULL DEFAULT 'Menunggu Verifikasi',
  catatan_dpl TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY laporans_npm_created_idx (npm, created_at DESC),
  CONSTRAINT laporans_student_fk FOREIGN KEY (npm) REFERENCES student_profiles (npm)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS student_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_profile_id BIGINT UNSIGNED NOT NULL,
  period_id BIGINT UNSIGNED NULL,
  jenis VARCHAR(48) NOT NULL,
  nama_file VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(160) NULL,
  file_size BIGINT UNSIGNED NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'Menunggu',
  catatan_verifikator TEXT NULL,
  diverifikasi_oleh VARCHAR(160) NULL,
  diverifikasi_pada DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY student_documents_profile_period_idx (student_profile_id, period_id, jenis, created_at DESC),
  CONSTRAINT student_documents_profile_fk FOREIGN KEY (student_profile_id) REFERENCES student_profiles (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT student_documents_period_fk FOREIGN KEY (period_id) REFERENCES kkm_periods (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT student_documents_type_chk CHECK (jenis IN ('Transkrip', 'KRS', 'KHS', 'Paspor', 'Bukti Pembayaran', 'Foto', 'Lainnya')),
  CONSTRAINT student_documents_size_chk CHECK (file_size IS NULL OR file_size > 0),
  CONSTRAINT student_documents_status_chk CHECK (status IN ('Menunggu', 'Disetujui', 'Perlu Revisi', 'Ditolak'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS berita (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  judul TEXT NULL,
  kategori VARCHAR(255) NULL,
  tanggal VARCHAR(255) NULL,
  penulis VARCHAR(255) NULL,
  gambar VARCHAR(512) NULL,
  konten TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY berita_created_idx (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pengaduan (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nama_pengadu VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  telepon VARCHAR(64) NULL,
  kategori VARCHAR(255) NULL,
  judul TEXT NULL,
  pesan TEXT NULL,
  lampiran TEXT NULL,
  status VARCHAR(64) NULL DEFAULT 'Baru',
  tanggapan TEXT NULL,
  assigned_admin_id BIGINT UNSIGNED NULL,
  assigned_admin VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY pengaduan_status_created_idx (status, created_at DESC),
  KEY pengaduan_admin_idx (assigned_admin_id),
  CONSTRAINT pengaduan_admin_fk FOREIGN KEY (assigned_admin_id) REFERENCES admins (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lppm_struktur (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  label VARCHAR(255) NULL,
  value VARCHAR(255) NULL,
  urutan INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY lppm_struktur_order_idx (urutan, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS prapendaftaran_settings (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  tanggal_mulai DATETIME(3) NULL,
  durasi_hari SMALLINT UNSIGNED NOT NULL DEFAULT 7,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT prapendaftaran_singleton_chk CHECK (id = 1),
  CONSTRAINT prapendaftaran_duration_chk CHECK (durasi_hari BETWEEN 1 AND 365)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dokumen (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  judul TEXT NOT NULL,
  kategori VARCHAR(255) NOT NULL,
  deskripsi TEXT NULL,
  file_url TEXT NOT NULL,
  format VARCHAR(16) NOT NULL,
  ukuran BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY dokumen_created_idx (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS timeline (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  judul TEXT NOT NULL,
  tanggal VARCHAR(255) NOT NULL,
  deskripsi TEXT NULL,
  status VARCHAR(64) NOT NULL DEFAULT 'Akan Datang',
  urutan INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY timeline_order_idx (urutan, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otp_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifier VARCHAR(64) NOT NULL,
  otp VARCHAR(10) NOT NULL,
  nama VARCHAR(255) NULL,
  npm VARCHAR(64) NULL,
  phone VARCHAR(20) NULL,
  password_hash VARCHAR(255) NULL,
  expires_at DATETIME(3) NOT NULL,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY otp_codes_identifier_created_idx (identifier, created_at DESC),
  KEY otp_codes_expires_idx (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS berkas_upload_settings (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT berkas_upload_singleton_chk CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profile_edit_settings (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT profile_edit_singleton_chk CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS logbook_week_settings (
  id TINYINT UNSIGNED NOT NULL DEFAULT 1,
  active_week TINYINT UNSIGNED NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  CONSTRAINT logbook_week_singleton_chk CHECK (id = 1),
  CONSTRAINT logbook_week_range_chk CHECK (active_week IS NULL OR active_week BETWEEN 1 AND 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kkm_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  period_id BIGINT UNSIGNED NULL,
  entity_type VARCHAR(32) NOT NULL,
  entity_id BIGINT UNSIGNED NOT NULL,
  student_profile_id BIGINT UNSIGNED NULL,
  logbook_id BIGINT UNSIGNED NULL,
  laporan_id BIGINT UNSIGNED NULL,
  student_document_id BIGINT UNSIGNED NULL,
  group_id BIGINT UNSIGNED NULL,
  pengaduan_id BIGINT UNSIGNED NULL,
  status_lama VARCHAR(64) NULL,
  status_baru VARCHAR(64) NOT NULL,
  catatan TEXT NULL,
  actor_role VARCHAR(24) NOT NULL,
  actor_identifier VARCHAR(160) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY kkm_status_history_entity_idx (entity_type, entity_id, created_at DESC),
  KEY kkm_status_history_period_idx (period_id),
  KEY kkm_status_history_student_idx (student_profile_id),
  KEY kkm_status_history_logbook_idx (logbook_id),
  KEY kkm_status_history_laporan_idx (laporan_id),
  KEY kkm_status_history_document_idx (student_document_id),
  KEY kkm_status_history_group_idx (group_id),
  KEY kkm_status_history_pengaduan_idx (pengaduan_id),
  CONSTRAINT kkm_status_history_period_fk FOREIGN KEY (period_id) REFERENCES kkm_periods (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT kkm_status_history_student_fk FOREIGN KEY (student_profile_id) REFERENCES student_profiles (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT kkm_status_history_logbook_fk FOREIGN KEY (logbook_id) REFERENCES logbooks (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT kkm_status_history_laporan_fk FOREIGN KEY (laporan_id) REFERENCES laporans (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT kkm_status_history_document_fk FOREIGN KEY (student_document_id) REFERENCES student_documents (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT kkm_status_history_group_fk FOREIGN KEY (group_id) REFERENCES kkm_groups (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT kkm_status_history_pengaduan_fk FOREIGN KEY (pengaduan_id) REFERENCES pengaduan (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT kkm_status_history_entity_type_chk CHECK (
    entity_type IN ('Mahasiswa', 'Logbook', 'Laporan', 'Berkas', 'Kelompok', 'Pengaduan')
  ),
  CONSTRAINT kkm_status_history_actor_role_chk CHECK (
    actor_role IN ('Sistem', 'Mahasiswa', 'DPL', 'LPPM', 'Admin')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO prapendaftaran_settings (id, tanggal_mulai, durasi_hari)
VALUES (1, NULL, 7)
ON DUPLICATE KEY UPDATE id = VALUES(id);

INSERT INTO berkas_upload_settings (id, is_enabled)
VALUES (1, FALSE)
ON DUPLICATE KEY UPDATE id = VALUES(id);

INSERT INTO profile_edit_settings (id, is_enabled)
VALUES (1, FALSE)
ON DUPLICATE KEY UPDATE id = VALUES(id);

INSERT INTO logbook_week_settings (id, active_week)
VALUES (1, NULL)
ON DUPLICATE KEY UPDATE id = VALUES(id);
