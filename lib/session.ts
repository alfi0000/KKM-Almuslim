import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const SESSION_COOKIE = "session_token";
export const ADMIN_SESSION_COOKIE = "session_admin";
export const DPL_SESSION_COOKIE = "session_dpl";
export const MAHASISWA_SESSION_COOKIE = "session_mahasiswa";
export const LPPM_SESSION_COOKIE = "session_lppm";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET wajib diatur dengan nilai acak minimal 32 karakter.");
  }
  return secret;
}

export interface SessionPayload {
  role: "mahasiswa" | "admin" | "dpl" | "lppm";
  npm?: string;
  nama?: string;
  username?: string;
  email?: string;
  nidn?: string;
  fakultas?: string;
  skema?: string;
  noHp?: string;
  alamat?: string;
  foto?: string;
}

/** Nama cookie ditentukan oleh peran agar login lintas portal tidak saling menimpa. */
export function cookieNameForRole(role?: string): string {
  if (role === "admin") return ADMIN_SESSION_COOKIE;
  if (role === "dpl") return DPL_SESSION_COOKIE;
  if (role === "mahasiswa") return MAHASISWA_SESSION_COOKIE;
  if (role === "lppm") return LPPM_SESSION_COOKIE;
  return SESSION_COOKIE;
}

function readableCookieNames(): string[] {
  return [ADMIN_SESSION_COOKIE, DPL_SESSION_COOKIE, MAHASISWA_SESSION_COOKIE, LPPM_SESSION_COOKIE];
}

function allSessionCookieNames(): string[] {
  return [...readableCookieNames(), ...LEGACY_SESSION_COOKIES];
}

/** Cookie legacy sistem lama — ikut dibersihkan saat logout, tidak pernah dibaca lagi. */
export const LEGACY_SESSION_COOKIES: string[] = [SESSION_COOKIE];

async function issueSessionCookie(payload: SessionPayload) {
  const token = jwt.sign(payload, getJwtSecret(), {
    expiresIn: "7d",
    algorithm: "HS256",
  });
  const cookieStore = await cookies();
  cookieStore.set(cookieNameForRole(payload.role), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    priority: "high",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function createSession(payload: SessionPayload) {
  await issueSessionCookie(payload);
}

/**
 * Baca sesi.
 * - `expectedRole` diisi ketika endpoint hanya melayani satu peran:
 *   hanya cookie peran itu yang diperiksa (mencegah salah portal).
 * - Tanpa `expectedRole`: cookie mana pun yang valid akan dipakai.
 */
export async function getSession(expectedRole?: SessionPayload["role"]): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const names = expectedRole ? [cookieNameForRole(expectedRole)] : readableCookieNames();

  // 1) Cookie baru per-peran
  for (const name of names) {
    const token = cookieStore.get(name)?.value;
    if (!token) continue;
    try {
      const payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }) as SessionPayload;
      if (!payload.role) continue;
      if (expectedRole && payload.role !== expectedRole) continue;
      return payload;
    } catch {
      // token tidak valid / kedaluwarsa — lanjut ke kandidat berikutnya
    }
  }

  // 2) Migrasi mulus: cookie legacy sistem lama diterima bila rolenya cocok,
  //    lalu langsung diterbitkan ulang sebagai cookie per-peran yang baru.
  const legacyToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (legacyToken) {
    try {
      const payload = jwt.verify(legacyToken, getJwtSecret(), { algorithms: ["HS256"] }) as SessionPayload;
      if (payload.role && (!expectedRole || payload.role === expectedRole)) {
        try {
          await issueSessionCookie(payload);
        } catch {
          // konteks non-Route-Handler tidak boleh set cookie — sesi tetap valid untuk request ini
        }
        return payload;
      }
    } catch {
      // legacy token tidak valid — abaikan
    }
  }

  return null;
}

export async function destroySession() {
  const cookieStore = await cookies();
  for (const name of allSessionCookieNames()) {
    cookieStore.delete(name);
  }
}
