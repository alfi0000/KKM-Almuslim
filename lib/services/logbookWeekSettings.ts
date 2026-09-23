import { mysql } from "../mysql";

export async function getActiveLogbookWeek(): Promise<number | null> {
  const row = await mysql.queryOne("SELECT active_week FROM logbook_week_settings WHERE id = 1");
  const week = Number(row?.active_week);
  return week >= 1 && week <= 3 ? week : null;
}

export async function setActiveLogbookWeek(week: number | null): Promise<number | null> {
  await mysql.execute(
    "INSERT INTO logbook_week_settings (id, active_week) VALUES (1, ?) ON DUPLICATE KEY UPDATE active_week = VALUES(active_week)",
    [week]
  );
  return week;
}
