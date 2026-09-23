import { mysql } from "../mysql";

export async function getBerkasUploadEnabled(): Promise<boolean> {
  const row = await mysql.queryOne("SELECT is_enabled FROM berkas_upload_settings WHERE id = 1");
  return Boolean(row?.is_enabled);
}

export async function setBerkasUploadEnabled(enabled: boolean): Promise<boolean> {
  await mysql.execute(
    "INSERT INTO berkas_upload_settings (id, is_enabled) VALUES (1, ?) ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)",
    [enabled]
  );
  return enabled;
}
