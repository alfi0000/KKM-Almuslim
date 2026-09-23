import { mysql } from "../mysql";
import { getAllAnnouncements, getAnnouncement } from "./announcement";
import { getBerita } from "./berita";
import { getDokumen } from "./dokumen";
import { getDpls } from "./dpls";
import { getGampongs } from "./gampongs";
import { getLaporansByNpm, getLaporansByNpms } from "./laporans";
import { getLogbooksByNpm, getLogbooksByNpms } from "./logbooks";
import { getLppmStruktur } from "./lppm";
import { getPengaduanList } from "./pengaduan";
import { getAllStudentProfiles, getStudentProfilesByDpl } from "./students";
import { getTimeline } from "./timeline";
export async function findAdminByUsername(username: string) {
  const cleanUsername = username.trim();
  return mysql.queryOne(
    `SELECT id, nama, username, email, password, role
     FROM admins
     WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
     LIMIT 1`,
    [cleanUsername, cleanUsername]
  );
}

export async function getSebaranGampongData() {
  const [profiles, gampongs, logbooks] = await Promise.all([
    getAllStudentProfiles(),
    getGampongs(),
    getLogbooksByNpm(),
  ]);
  return { profiles, gampongs, logbooks };
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

// Cache sederhana 30 detik untuk mengurangi beban DB saat polling dashboard
let adminCache: { data: Awaited<ReturnType<typeof fetchAdminDataOnce>> | null; ts: number } = { data: null, ts: 0 };
const ADMIN_CACHE_TTL_MS = 30_000;

export async function getAdminData(opts?: { forceRefresh?: boolean }) {
  const now = Date.now();
  if (!opts?.forceRefresh && adminCache.data && now - adminCache.ts < ADMIN_CACHE_TTL_MS) {
    return adminCache.data;
  }
  const fresh = await withRetry(fetchAdminDataOnce, 1);
  // retry hanya 1x untuk admin agar tidak memperparah beban saat DB bermasalah
  adminCache = { data: fresh, ts: now };
  return fresh;
}

export async function getAdminDataPaginated(opts: {
  profileLimit?: number;
  profileOffset?: number;
  logbookLimit?: number;
  laporanLimit?: number;
} = {}) {
  // Endpoint per-tab: hanya ambil yang dibutuhkan, cegah respons raksasa
  const profileLimit = Math.min(Math.max(opts.profileLimit ?? 200, 1), 1000);
  const profileOffset = Math.max(opts.profileOffset ?? 0, 0);
  const logbookLimit = Math.min(Math.max(opts.logbookLimit ?? 200, 1), 1000);
  const laporanLimit = Math.min(Math.max(opts.laporanLimit ?? 200, 1), 1000);
  const [profiles, logbooks, laporans] = await Promise.all([
    getAllStudentProfiles({ limit: profileLimit, offset: profileOffset }),
    // logbooks/laporans order DESC, ambil terbaru saja
    getLogbooksByNpm(undefined, logbookLimit),
    getLaporansByNpm(undefined, laporanLimit),
  ]);
  return { profiles, logbooks, laporans };
}

async function fetchAdminDataOnce() {
  const [profiles, logbooks, laporans, gampongs, dpls, berita, pengaduans, struktur, dokumen, timeline, announcements] =
    await Promise.all([
      getAllStudentProfiles(),
      getLogbooksByNpm(undefined, 500),
      getLaporansByNpm(undefined, 500),
      getGampongs(),
      getDpls(),
      getBerita(),
      getPengaduanList(),
      getLppmStruktur(),
      getDokumen(),
      getTimeline(),
      getAllAnnouncements(),
    ]);

  const uniqueGampong = new Set([
    ...profiles.map((profile) => profile.gampong).filter(Boolean),
    ...gampongs.map((gampong) => gampong.nama).filter(Boolean),
  ]);
  const uniqueDpl = new Set([
    ...profiles.map((profile) => profile.dpl).filter(Boolean),
    ...dpls.map((dpl) => dpl.nama).filter(Boolean),
  ]);

  return {
    profiles,
    logbooks,
    laporans,
    gampongs,
    dpls,
    berita,
    pengaduans,
    struktur,
    dokumen,
    timeline,
    announcements,
    stats: {
      totalPendaftar: profiles.length,
      totalGampong: uniqueGampong.size,
      totalDpl: uniqueDpl.size,
      totalLogbook: logbooks.length,
      totalLaporan: laporans.length,
      totalBerita: berita.length,
      totalPengaduan: pengaduans.length,
    },
  };
}

export async function getDplData(nama: string) {
  return withRetry(async () => {
    const profiles = await getStudentProfilesByDpl(nama);
    const npms = profiles.map((profile) => profile.npm).filter(Boolean);
    const [logbooks, laporans] = await Promise.all([
      getLogbooksByNpms(npms),
      getLaporansByNpms(npms),
    ]);
    return { profiles, logbooks, laporans };
  });
}

export async function getPublicStats() {
  const [row, announcement] = await Promise.all([
    mysql.queryOne(
      `SELECT
         GREATEST((SELECT COUNT(*) FROM student_profiles), (SELECT COUNT(*) FROM users)) AS mahasiswa,
         (SELECT COUNT(*) FROM gampongs) AS gampong,
         (SELECT COUNT(DISTINCT kecamatan) FROM gampongs WHERE kecamatan IS NOT NULL AND kecamatan <> '') AS kecamatan`
    ),
    getAnnouncement(),
  ]);

  let angkatan = "XXXV";
  if (announcement?.message) {
    const match = announcement.message.match(/Angkatan\s+([A-Z0-9]+)/i);
    if (match) angkatan = match[1];
  }

  return {
    mahasiswa: Number(row?.mahasiswa) || 0,
    gampong: Number(row?.gampong) || 0,
    kecamatan: Number(row?.kecamatan) || 0,
    angkatan,
  };
}
