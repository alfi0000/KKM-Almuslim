import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
// Cookie per-peran (lihat lib/session.ts). 'session_token' hanya legacy.
const ROLE_COOKIE_BY_AREA: Record<string, string> = {
  admin: 'session_admin',
  dpl: 'session_dpl',
  mahasiswa: 'session_mahasiswa',
  lppm: 'session_lppm',
};

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

const RATE_LIMIT_WINDOW_MS = boundedInteger(process.env.RATE_LIMIT_WINDOW_MS, 60_000, 1_000, 3_600_000);
const RATE_LIMIT_MAX = boundedInteger(process.env.RATE_LIMIT_MAX, 120, 10, 10_000);
const RATE_LIMIT_MAX_KEYS = boundedInteger(process.env.RATE_LIMIT_MAX_KEYS, 5_000, 500, 50_000);
const RATE_LIMIT_SWEEP_MS = Math.min(RATE_LIMIT_WINDOW_MS, 60_000);
const ipCounters = new Map<string, { count: number; start: number }>();
let lastRateLimitSweep = 0;

function sweepRateLimits(now: number) {
  if (now - lastRateLimitSweep < RATE_LIMIT_SWEEP_MS && ipCounters.size < RATE_LIMIT_MAX_KEYS) return;
  lastRateLimitSweep = now;
  for (const [storedKey, value] of ipCounters) {
    if (now - value.start >= RATE_LIMIT_WINDOW_MS) ipCounters.delete(storedKey);
  }
  while (ipCounters.size >= RATE_LIMIT_MAX_KEYS) {
    const oldestKey = ipCounters.keys().next().value as string | undefined;
    if (!oldestKey) break;
    ipCounters.delete(oldestKey);
  }
}

function checkRateLimit(key: string, max = RATE_LIMIT_MAX) {
  const now = Date.now();
  sweepRateLimits(now);
  const entry = ipCounters.get(key) || { count: 0, start: now };
  if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
    entry.count = 1;
    entry.start = now;
  } else {
    entry.count += 1;
  }
  ipCounters.set(key, entry);
  return {
    limited: entry.count > max,
    retryAfterSeconds: Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.start)) / 1_000)),
  };
}

function getClientIp(request: NextRequest): string {
  const trustProxyHeaders = process.env.TRUST_PROXY_HEADERS !== 'false';
  if (trustProxyHeaders) {
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const realIp = request.headers.get('x-real-ip')?.trim();
    const candidate = forwarded || realIp;
    if (candidate && candidate.length <= 64 && /^[0-9a-f:.]+$/i.test(candidate)) return candidate;
  }
  return 'direct';
}

function getAuthenticatedRateLimitIdentity(request: NextRequest, expectedRole?: string): string | null {
  if (!JWT_SECRET || JWT_SECRET.length < 32) return null;

  const cookieNames = expectedRole
    ? [ROLE_COOKIE_BY_AREA[expectedRole]].filter(Boolean)
    : Object.values(ROLE_COOKIE_BY_AREA);
  for (const cookieName of cookieNames) {
    const token = request.cookies.get(cookieName)?.value;
    if (!token) continue;

    try {
      const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      if (!payload || typeof payload !== 'object') continue;

      const { role, npm, nidn, username, email } = payload as Record<string, unknown>;
      const subject = [npm, nidn, username, email].find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0
      );
      if (typeof role === 'string' && (!expectedRole || role === expectedRole) && subject) {
        return `${role}:${subject.trim()}`;
      }
    } catch {
      // Cookie tidak valid tidak boleh dipakai sebagai identitas rate limit.
    }
  }

  return null;
}

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

function getSessionRole(request: NextRequest, expectedRole: string): string | null {
  if (!JWT_SECRET || JWT_SECRET.length < 32) return null;
  const cookieNames = [ROLE_COOKIE_BY_AREA[expectedRole], 'session_token'].filter(Boolean);
  for (const name of cookieNames) {
    const token = request.cookies.get(name)?.value;
    if (!token) continue;
    try {
      const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      const role = typeof payload === 'object' && typeof payload.role === 'string' ? payload.role : null;
      if (role && role === expectedRole) return role;
    } catch {
      // token tidak valid / kedaluwarsa — coba kandidat berikutnya
    }
  }
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin') || '';
  const isPrivateApi = /^\/api\/(admin|dpl|mahasiswa|lppm|auth)(\/|$)/.test(pathname) || pathname === '/api/upload';

  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'geolocation=()',
    'X-XSS-Protection': '1; mode=block',
  };
  if (isPrivateApi) headers['Cache-Control'] = 'no-store, private';

  if (ALLOWED_ORIGINS.length > 0 && origin && ALLOWED_ORIGINS.includes(String(origin))) {
    headers['Access-Control-Allow-Origin'] = String(origin);
    headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  }

  const ip = getClientIp(request);
  const expectedRole = pathname.startsWith('/api/mahasiswa/')
    ? 'mahasiswa'
    : pathname.startsWith('/api/admin/')
      ? 'admin'
      : pathname.startsWith('/api/dpl/')
        ? 'dpl'
        : pathname.startsWith('/api/lppm/')
          ? 'lppm'
          : undefined;
  const rateLimitIdentity = getAuthenticatedRateLimitIdentity(request, expectedRole) || ip;
  const isLogin = pathname === '/api/auth/login' || pathname === '/api/auth/admin/login' || pathname === '/api/auth/dpl/login' || pathname === '/api/auth/lppm/login' || pathname === '/api/auth/register' || pathname === '/api/auth/otp/request' || pathname === '/api/auth/otp/verify';
  const bucket = isLogin ? 'login' : pathname.startsWith('/api/verifikasi/') ? 'verification' : pathname === '/api/pengaduan' ? 'complaint' : pathname === '/api/upload' ? 'upload' : 'global';
  const max = bucket === 'login' ? 15 : bucket === 'complaint' ? 10 : bucket === 'verification' ? 30 : bucket === 'upload' ? 12 : RATE_LIMIT_MAX;
  const rateLimit = checkRateLimit(`${bucket}:${rateLimitIdentity}`, max);
  if (rateLimit.limited) {
    return NextResponse.json(
      { success: false, error: 'Terlalu banyak percobaan. Mohon tunggu satu menit kemudian coba lagi.' },
      { status: 429, headers: { ...headers, 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  const maxBodySize = pathname === '/api/upload' ? 11 * 1024 * 1024 : 1024 * 1024;
  if (contentLength > maxBodySize) {
    return NextResponse.json({ success: false, error: 'Payload terlalu besar.' }, { status: 413, headers });
  }

  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  if (pathname.startsWith('/api/') && isMutation && origin) {
    let originAllowed = false;
    try {
      const originUrl = new URL(origin);
      const normalizedOrigin = originUrl.origin;
      // Acuan utama: Host header (otoritas yang dipakai klien).
      // request.nextUrl.origin tidak bisa diandalkan sendirian karena saat
      // server bind 0.0.0.0 (mis. Docker dev --hostname 0.0.0.0), nilainya
      // menjadi http://0.0.0.0:3000 sehingga Origin valid ikut ditolak.
      const host = (request.headers.get('host') || '').toLowerCase();
      originAllowed =
        (host !== '' && originUrl.host.toLowerCase() === host) ||
        normalizedOrigin === request.nextUrl.origin ||
        ALLOWED_ORIGINS.includes(normalizedOrigin);
    } catch {
      originAllowed = false;
    }
    if (!originAllowed) {
      return NextResponse.json({ success: false, error: 'Origin tidak diizinkan.' }, { status: 403, headers });
    }
  }

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers });
  }

  // Server-side auth guard: redirect unauthenticated visitors straight to login
  const isAdminArea = pathname.startsWith('/admin');
  const isDplArea = pathname.startsWith('/dpl');
  const isLppmArea = pathname.startsWith('/lppm');
  if (isAdminArea || isDplArea || isLppmArea) {
    const isLoginPage = pathname === '/admin/login' || pathname === '/dpl/login' || pathname === '/lppm/login';
    let requiredRole: string | null = null;
    if (isAdminArea) requiredRole = 'admin';
    else if (isDplArea) requiredRole = 'dpl';
    else if (isLppmArea) requiredRole = 'lppm';
    if (requiredRole && !isLoginPage && getSessionRole(request, requiredRole) !== requiredRole) {
      const loginPath = isAdminArea ? '/admin/login' : isDplArea ? '/dpl/login' : '/lppm/login';
      return NextResponse.redirect(new URL(loginPath, request.url));
    }
  }

  const response = NextResponse.next();
  Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static asset files (API routes stay covered for rate limiting & security headers)
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|woff2?)$).*)',
  ],
};
