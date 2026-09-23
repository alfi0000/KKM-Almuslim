import { mysql } from "../mysql";
import { isoDateTime } from "../db-utils";
import { AnnouncementRecord } from "../types";
import type { SqlValue } from "../mysql";
function mapRow(row: Record<string, unknown>): AnnouncementRecord {
  return {
    id: Number(row.id),
    label: String(row.label ?? ""),
    message: String(row.message ?? ""),
    deadline: row.deadline ? isoDateTime(row.deadline) : undefined,
    isActive: Boolean(row.is_active),
    createdAt: isoDateTime(row.created_at),
    updatedAt: isoDateTime(row.updated_at),
  };
}

export async function getAnnouncement(): Promise<AnnouncementRecord | null> {
  const row = await mysql.queryOne(
    "SELECT id, label, message, deadline, is_active, created_at, updated_at FROM hero_announcement WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1"
  );
  return row ? mapRow(row) : null;
}

export async function getAllAnnouncements(): Promise<AnnouncementRecord[]> {
  const rows = await mysql.queryRows(
    "SELECT id, label, message, deadline, is_active, created_at, updated_at FROM hero_announcement ORDER BY updated_at DESC"
  );
  return rows.map(mapRow);
}

export async function addAnnouncement(data: Omit<AnnouncementRecord, "id" | "createdAt" | "updatedAt">): Promise<AnnouncementRecord> {
  const result = await mysql.execute(
    "INSERT INTO hero_announcement (label, message, deadline, is_active) VALUES (?, ?, ?, ?)",
    [data.label.trim(), data.message.trim(), data.deadline || null, data.isActive ? 1 : 0]
  );
  const row = await mysql.queryOne(
    "SELECT id, label, message, deadline, is_active, created_at, updated_at FROM hero_announcement WHERE id = ?",
    [result.insertId]
  );
  if (!row) throw new Error("Gagal menambah pengumuman.");
  return mapRow(row);
}

export async function updateAnnouncement(
  id: number,
  data: Partial<Omit<AnnouncementRecord, "id" | "createdAt" | "updatedAt">>
): Promise<AnnouncementRecord | null> {
  const fields: string[] = [];
  const values: SqlValue[] = [];

  if (data.label !== undefined) {
    fields.push("label = ?");
    values.push(data.label.trim());
  }
  if (data.message !== undefined) {
    fields.push("message = ?");
    values.push(data.message.trim());
  }
  if (data.deadline !== undefined) {
    fields.push("deadline = ?");
    values.push(data.deadline || null);
  }
  if (data.isActive !== undefined) {
    fields.push("is_active = ?");
    values.push(data.isActive ? 1 : 0);
  }

  if (fields.length === 0) return null;

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  await mysql.execute(`UPDATE hero_announcement SET ${fields.join(", ")} WHERE id = ?`, values);

  const row = await mysql.queryOne(
    "SELECT id, label, message, deadline, is_active, created_at, updated_at FROM hero_announcement WHERE id = ?",
    [id]
  );
  return row ? mapRow(row) : null;
}

export async function deleteAnnouncement(id: number): Promise<boolean> {
  const result = await mysql.execute("DELETE FROM hero_announcement WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

export async function setActiveAnnouncement(id: number): Promise<void> {
  await mysql.execute("UPDATE hero_announcement SET is_active = 0 WHERE is_active = 1");
  await mysql.execute("UPDATE hero_announcement SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
}
