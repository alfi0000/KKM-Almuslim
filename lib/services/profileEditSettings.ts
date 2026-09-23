import { mysql } from "../mysql";

export async function getProfileEditEnabled(): Promise<boolean> {
  const row = await mysql.queryOne("SELECT is_enabled FROM profile_edit_settings WHERE id = 1");
  return Boolean(row?.is_enabled);
}

export async function setProfileEditEnabled(enabled: boolean): Promise<boolean> {
  await mysql.execute(
    "INSERT INTO profile_edit_settings (id, is_enabled) VALUES (1, ?) ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled)",
    [enabled]
  );
  return enabled;
}
