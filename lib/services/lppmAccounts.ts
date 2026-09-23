import { mysql } from "../mysql";

export interface LppmRecord {
  id?: number;
  nama: string;
  username: string;
  password?: string;
  role: string;
  created_at?: string;
}

export async function findLppmByUsername(username: string): Promise<LppmRecord | undefined> {
  const clean = username.trim();
  const row = await mysql.queryOne(
    "SELECT id, nama, username, password, role, created_at FROM lppm WHERE LOWER(username) = LOWER(?) LIMIT 1",
    [clean]
  );
  return row as unknown as LppmRecord | undefined;
}
