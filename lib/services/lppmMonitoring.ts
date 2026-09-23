import { getDpls } from "./dpls";
import { getGampongs } from "./gampongs";
import { getLaporansByNpm } from "./laporans";
import { getLogbooksByNpm } from "./logbooks";
import { getAllStudentProfiles } from "./students";

export async function getLppmMonitoringData() {
  const [gampongs, profiles, dpls, laporans, logbooks] = await Promise.all([
    getGampongs(),
    getAllStudentProfiles(),
    getDpls(),
    getLaporansByNpm(),
    getLogbooksByNpm(undefined, 200),
  ]);

  const dplByName = new Map(dpls.map((dpl) => [dpl.nama, dpl]));
  const laporanByNpm = new Map<string, typeof laporans>();
  for (const laporan of laporans) {
    if (!laporanByNpm.has(laporan.npm)) laporanByNpm.set(laporan.npm, []);
    laporanByNpm.get(laporan.npm)?.push(laporan);
  }

  const gampongDetails = gampongs.map((gampong) => {
    const gampongName = gampong.nama.trim().toLowerCase();
    const dplName = gampong.dpl || "";
    const mahasiswas = profiles.filter(
      (profile) => profile.gampong.trim().toLowerCase() === gampongName
    );
    const laporanGampong = mahasiswas.flatMap(
      (student) => laporanByNpm.get(student.npm) || []
    );
    return {
      gampong,
      dpl: dplByName.get(dplName) || null,
      dplNama: dplName,
      mahasiswas,
      laporans: laporanGampong,
      totalMahasiswa: mahasiswas.length,
      totalLaporan: laporanGampong.length,
    };
  });

  const registeredNames = new Set(gampongs.map((gampong) => gampong.nama.trim().toLowerCase()));
  const orphanGroups = new Map<string, typeof profiles>();
  for (const profile of profiles) {
    const normalized = profile.gampong.trim().toLowerCase();
    if (!normalized || registeredNames.has(normalized)) continue;
    const name = profile.gampong.trim() || "Tanpa Gampong";
    if (!orphanGroups.has(name)) orphanGroups.set(name, []);
    orphanGroups.get(name)?.push(profile);
  }

  for (const [name, mahasiswas] of orphanGroups) {
    const first = mahasiswas[0];
    const laporanGampong = mahasiswas.flatMap(
      (student) => laporanByNpm.get(student.npm) || []
    );
    const dplName = first?.dpl || "";
    gampongDetails.push({
      gampong: {
        id: -1,
        nama: name,
        skema: first?.program || "KKM",
        kecamatan: first?.kecamatan || "-",
        dpl: dplName,
        posko: first?.posko || "-",
        kuota: 0,
      },
      dpl: dplByName.get(dplName) || null,
      dplNama: dplName,
      mahasiswas,
      laporans: laporanGampong,
      totalMahasiswa: mahasiswas.length,
      totalLaporan: laporanGampong.length,
    });
  }

  return {
    gampongs,
    dpls,
    profiles,
    laporans,
    logbooks,
    gampongDetails,
    stats: {
      totalGampong: gampongs.length + orphanGroups.size,
      totalMahasiswa: profiles.length,
      totalDpl: dpls.length,
      totalLaporan: laporans.length,
      totalLogbook: logbooks.length,
    },
  };
}
