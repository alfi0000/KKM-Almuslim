CREATE TABLE IF NOT EXISTS `hero_announcement` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `label` VARCHAR(50) NOT NULL DEFAULT 'INFORMASI RESMI',
  `message` VARCHAR(500) NOT NULL,
  `deadline` DATE NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default announcement
INSERT INTO `hero_announcement` (`label`, `message`, `deadline`, `is_active`) VALUES
('INFORMASI RESMI', 'Pendaftaran KKM Universitas Almuslim Angkatan XXXV Tahun 2026 Resmi Dibuka.', '2026-07-25', 1);
