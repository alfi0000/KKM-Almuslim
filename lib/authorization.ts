import { AppError } from "./error";
import { getSession, type SessionPayload } from "./session";

type Role = SessionPayload["role"];

export async function requireRole(role: Role): Promise<SessionPayload> {
  const session = await getSession(role);
  if (!session) throw new AppError("Tidak terautentikasi.", 401);
  if (session.role !== role) throw new AppError("Akses ditolak.", 403);
  return session;
}

export async function requireAnyRole(roles: readonly Role[]): Promise<SessionPayload> {
  let session: SessionPayload | null = null;
  for (const role of roles) {
    session = await getSession(role);
    if (session) break;
  }
  if (!session) throw new AppError("Tidak terautentikasi.", 401);
  if (!roles.includes(session.role)) throw new AppError("Akses ditolak.", 403);
  return session;
}

export async function requireStudent(requestedNpm?: unknown): Promise<SessionPayload & { npm: string }> {
  const session = await requireRole("mahasiswa");
  if (!session.npm) throw new AppError("Sesi mahasiswa tidak valid.", 401);
  if (requestedNpm != null && String(requestedNpm).trim() !== session.npm) {
    throw new AppError("Anda tidak berwenang mengakses data mahasiswa lain.", 403);
  }
  return session as SessionPayload & { npm: string };
}

export async function requireDpl(requestedNidn?: unknown): Promise<SessionPayload & { nidn: string }> {
  const session = await requireRole("dpl");
  if (!session.nidn) throw new AppError("Sesi DPL tidak valid.", 401);
  if (requestedNidn != null && String(requestedNidn).trim() !== session.nidn) {
    throw new AppError("Anda tidak berwenang mengakses profil DPL lain.", 403);
  }
  return session as SessionPayload & { nidn: string };
}
