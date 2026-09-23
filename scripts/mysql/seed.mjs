import bcrypt from "bcryptjs";
import { connectMysql } from "./connection.mjs";

function requiredSecret(name) {
  const value = process.env[name]?.trim();
  if (!value || value.length < 8) throw new Error(`${name} wajib diisi minimal 8 karakter.`);
  return value;
}

const adminPassword = requiredSecret("BOOTSTRAP_ADMIN_PASSWORD");
const lppmPassword = requiredSecret("BOOTSTRAP_LPPM_PASSWORD");
const adminUsername = process.env.BOOTSTRAP_ADMIN_USERNAME?.trim() || "Admin";
const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim() || "admin@example.com";
const lppmUsername = process.env.BOOTSTRAP_LPPM_USERNAME?.trim() || "lppm";
const overwrite = process.env.BOOTSTRAP_OVERWRITE_PASSWORDS === "true";
const [adminHash, lppmHash] = await Promise.all([
  bcrypt.hash(adminPassword, 12),
  bcrypt.hash(lppmPassword, 12),
]);

const connection = await connectMysql();
try {
  await connection.beginTransaction();
  await connection.execute(
    `INSERT INTO kkm_programs (kode, nama, aktif, requires_paspor)
     VALUES
       ('REGULER', 'KKM Reguler', TRUE, FALSE),
       ('NON_REGULER', 'KKM Non-Reguler', TRUE, FALSE),
       ('INTERNASIONAL', 'KKM Internasional', TRUE, TRUE)
     ON DUPLICATE KEY UPDATE
       nama = VALUES(nama), aktif = VALUES(aktif), requires_paspor = VALUES(requires_paspor)`
  );
  if (overwrite) {
    await connection.execute(
      `INSERT INTO admins (nama, username, email, password, role)
       VALUES ('Admin', ?, ?, ?, 'admin')
       ON DUPLICATE KEY UPDATE nama = VALUES(nama), email = VALUES(email), password = VALUES(password), role = VALUES(role)`,
      [adminUsername, adminEmail, adminHash]
    );
    await connection.execute(
      `INSERT INTO lppm (nama, username, password, role)
       VALUES ('LPPM Universitas Almuslim', ?, ?, 'lppm')
       ON DUPLICATE KEY UPDATE nama = VALUES(nama), password = VALUES(password), role = VALUES(role)`,
      [lppmUsername, lppmHash]
    );
  } else {
    await connection.execute(
      `INSERT INTO admins (nama, username, email, password, role)
       VALUES ('Admin', ?, ?, ?, 'admin')
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [adminUsername, adminEmail, adminHash]
    );
    await connection.execute(
      `INSERT INTO lppm (nama, username, password, role)
       VALUES ('LPPM Universitas Almuslim', ?, ?, 'lppm')
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
      [lppmUsername, lppmHash]
    );
  }
  await connection.commit();
  console.log("Akun bootstrap admin dan LPPM berhasil dipastikan tersedia.");
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
