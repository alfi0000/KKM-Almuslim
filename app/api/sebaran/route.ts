import { NextResponse } from "next/server";
import { getSebaranGampongData } from "@/lib/db";
import { handleError } from "@/lib/error";

export const dynamic = "force-dynamic";

// Cache 60 detik untuk halaman publik — cegah DB hammer saat pengunjung banyak
let sebaranCache: { data: unknown; ts: number } | null = null;
const SEBARAN_TTL_MS = 60_000;

export async function GET() {
  try {
    const now = Date.now();
    if (sebaranCache && now - sebaranCache.ts < SEBARAN_TTL_MS) {
      return NextResponse.json(sebaranCache.data, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
    }
    const { profiles, gampongs, logbooks } = await getSebaranGampongData();

    // Map each gampong to include student counts, kordes, and focus
    type SebaranGampong = { nama: string; skema: string; kecamatan?: unknown; dpl?: unknown; posko?: unknown };
    type SebaranProfile = { nama?: unknown; prodi?: unknown; npm?: unknown; gampong?: unknown; isKetuaKelompok?: unknown };
    type SebaranLogbook = { npm: unknown; judul: unknown };

    // Optimasi: index profiles & logbooks sekali, hindari filter berulang O(n*m) per gampong
    const profilesByGampongNorm = new Map<string, SebaranProfile[]>();
    const npmToGampongNorm = new Map<string, string>();
    for (const p of profiles as SebaranProfile[]) {
      if (!p.gampong || typeof p.gampong !== "string") continue;
      const norm = p.gampong.toLowerCase().trim();
      if (!profilesByGampongNorm.has(norm)) profilesByGampongNorm.set(norm, []);
      profilesByGampongNorm.get(norm)!.push(p);
      if (p.npm) npmToGampongNorm.set(String(p.npm), norm);
    }
    const logbooksByNpm = new Map<string, SebaranLogbook[]>();
    for (const lb of logbooks as SebaranLogbook[]) {
      const key = String(lb.npm);
      if (!logbooksByNpm.has(key)) logbooksByNpm.set(key, []);
      logbooksByNpm.get(key)!.push(lb);
    }

    const sebaran = gampongs.map((gam: SebaranGampong) => {
      const gNameNorm = gam.nama.toLowerCase().trim();
      // Cari profiles yang mengandung nama gampong (tetap dukung includes, tapi via map iterasi yang lebih sedikit)
      let assignedProfiles: SebaranProfile[] = profilesByGampongNorm.get(gNameNorm) || [];
      if (assignedProfiles.length === 0) {
        // fallback: scan hanya jika tidak ada exact match (misal typo spasi)
        assignedProfiles = (profiles as SebaranProfile[]).filter((p) => {
          if (!p.gampong || typeof p.gampong !== "string") return false;
          const pG = p.gampong.toLowerCase().trim();
          return pG.includes(gNameNorm) || gNameNorm.includes(pG);
        });
      }

      const kordesProfile = assignedProfiles.find((p) => p.isKetuaKelompok === 1);
      const kordes = kordesProfile ? `${String(kordesProfile.nama)} (${String(kordesProfile.prodi)})` : "Belum Ditunjuk";

      const gampongLogbooks: SebaranLogbook[] = [];
      for (const p of assignedProfiles) {
        const lbs = logbooksByNpm.get(String(p.npm));
        if (lbs) gampongLogbooks.push(...lbs);
      }

      let fokus = "";
      if (gampongLogbooks.length > 0) {
        const uniqueTitles = Array.from(new Set(gampongLogbooks.map((log) => String(log.judul)))).slice(0, 2).join(" & ");
        fokus = uniqueTitles;
      }
      if (!fokus) {
        fokus = gam.skema === "KKM Internasional"
          ? "Pemberdayaan Masyarakat Global & Kolaborasi Lintas Negara"
          : gam.skema === "KKM Non-Reguler"
            ? "Pengembangan UMKM Mandiri & Digitalisasi Desa"
            : "Pemberdayaan Gampong, Edukasi Masyarakat & Kebersihan Posko";
      }

      return {
        nama: gam.nama,
        kecamatan: gam.kecamatan,
        kabupaten: gam.kecamatan === "Luar Negeri" ? "Malaysia" : "Bireuen",
        kordes,
        dpl: gam.dpl || "Belum Ditentukan",
        mahasiswa: assignedProfiles.length,
        fokus,
        status: "Berlangsung",
        posko: gam.posko || `Posko KKM ${gam.nama}`,
      };
    });

    const payload = { success: true, gampongs: sebaran };
    sebaranCache = { data: payload, ts: now };
    return NextResponse.json(payload, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
  } catch (error: unknown) {
    return handleError(error);
  }
}
