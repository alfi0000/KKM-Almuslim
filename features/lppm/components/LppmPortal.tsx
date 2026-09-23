"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Users,
  FileText,
  UserCheck,
  Building2,
  Search,
  ArrowLeft,
  Menu,
  ShieldCheck,
  FileCheck,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Loader2,
} from "lucide-react";
import LppmSidebar, { type LppmTab } from "./LppmSidebar";
import type {
  GampongDetail,
  LppmDplRecord as DplRecord,
  LppmLaporanRecord as LaporanRecord,
  LppmStudentProfileRecord as StudentProfileRecord,
} from "../types";
import { fetchLppmData } from "../api/lppm-api";
import { useVisibilityPolling } from "@/hooks/use-visibility-polling";

function LppmContent() {
  const router = useRouter();
  const [session, setSession] = useState<{ nama?: string; username?: string; role?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<LppmTab>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGampong, setExpandedGampong] = useState<string | null>(null);
  const [expandedNpm, setExpandedNpm] = useState<string | null>(null);

  const [gampongDetails, setGampongDetails] = useState<GampongDetail[]>([]);
  const [dpls, setDpls] = useState<DplRecord[]>([]);
  const [profiles, setProfiles] = useState<StudentProfileRecord[]>([]);
  const [laporans, setLaporans] = useState<LaporanRecord[]>([]);
  const [stats, setStats] = useState({ totalGampong: 0, totalMahasiswa: 0, totalDpl: 0, totalLaporan: 0, totalLogbook: 0 });

  const loadData = useCallback((silent = false) => {
    if (!silent) setIsLoading(true);
    return fetchLppmData()
      .then((result) => {
        if (result.authenticationFailed) {
          router.push("/lppm/login");
          return;
        }
        if (result.data) {
          setGampongDetails(result.data.gampongDetails || []);
          setDpls(result.data.dpls || []);
          setProfiles(result.data.profiles || []);
          setLaporans(result.data.laporans || []);
          setStats(result.data.stats || { totalGampong: 0, totalMahasiswa: 0, totalDpl: 0, totalLaporan: 0, totalLogbook: 0 });
        }
      })
      .catch((err) => console.error("Error fetching LPPM data", err))
      .finally(() => {
        if (!silent) setIsLoading(false);
      });
  }, [router]);

  useEffect(() => {
    fetch("/api/auth/session?role=lppm")
      .then((res) => res.json())
      .then((resData) => {
        if (!resData.success || !resData.session || resData.session.role !== "lppm") {
          router.push("/lppm/login");
          return;
        }
        setSession(resData.session);
        void loadData();
      })
      .catch((err) => {
        console.error("Session error", err);
        setIsLoading(false);
      });
  }, [loadData, router]);

  useVisibilityPolling(() => loadData(true));

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error", err);
    }
    router.push("/lppm/login");
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "-";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  // Filtered lists
  const filteredGampongDetails = gampongDetails.filter((gd) => {
    const q = searchQuery.toLowerCase();
    return (
      gd.gampong.nama.toLowerCase().includes(q) ||
      gd.gampong.kecamatan.toLowerCase().includes(q) ||
      gd.dplNama.toLowerCase().includes(q) ||
      gd.gampong.posko.toLowerCase().includes(q)
    );
  });

  const filteredProfiles = profiles.filter(
    (p) =>
      p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.npm.includes(searchQuery) ||
      p.gampong.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.dpl.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLaporans = laporans.filter(
    (l) =>
      l.namaFile.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.jenis.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.npm.includes(searchQuery)
  );

  const filteredDpls = dpls.filter(
    (d) =>
      d.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.nidn.includes(searchQuery) ||
      d.fakultas.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper: get laporan per mahasiswa
  const laporanByNpm = new Map<string, LaporanRecord[]>();
  for (const lap of laporans) {
    if (!laporanByNpm.has(lap.npm)) laporanByNpm.set(lap.npm, []);
    laporanByNpm.get(lap.npm)!.push(lap);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F5132] mx-auto" />
          <p className="text-sm text-[#718096]">Memuat Dashboard LPPM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A202C]">
      <LppmSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={{ gampong: stats.totalGampong, mahasiswa: stats.totalMahasiswa, laporan: stats.totalLaporan, dpl: stats.totalDpl }}
        session={session}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onLogout={handleLogout}
      />

      <div className={`${isSidebarCollapsed ? "md:ml-20" : "md:ml-64"} min-w-0 transition-all duration-300`}>
        <main className="dashboard-page mx-auto max-w-7xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsMobileOpen(true)}
                className="btn-secondary p-2 md:hidden"
                aria-label="Buka menu"
              >
                <Menu className="w-4 h-4 text-[#0F5132]" />
              </button>
              <Link href="/" className="btn-secondary text-xs shadow-xs hidden sm:inline-flex">
                <ArrowLeft className="w-4 h-4 text-[#0F5132]" />
                <span>Kembali ke Portal</span>
              </Link>
              <span className="badge-academic text-xs font-bold bg-[#0F5132] text-white border-[#0F5132] hidden lg:inline-flex">
                <Building2 className="w-3.5 h-3.5 text-white" />
                LPPM • Monitoring Terpadu
              </span>
            </div>
            <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:gap-3">
              <div className="relative min-w-0 flex-1 sm:flex-none">
                <Search className="w-4 h-4 text-[#A0AEC0] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari gampong, mahasiswa, DPL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="academic-input w-full min-w-0 rounded-lg py-2 pl-9 pr-3 text-xs sm:w-64"
                />
              </div>
            </div>
          </div>

          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="academic-card space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs sm:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-6 h-6 text-[#0F5132]" />
                      <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A202C]">Dashboard Monitoring LPPM</h1>
                    </div>
                    <p className="text-xs sm:text-sm text-[#718096]">Pantau sebaran gampong, mahasiswa, DPL dan rekap laporan KKM secara terpadu.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0F5132]" />
                    <span className="text-xs font-bold text-[#0F5132]">Read-Only Monitoring</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#718096] uppercase tracking-wide">Total Gampong</span>
                      <MapPin className="w-4 h-4 text-[#0F5132]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#1A202C]">{stats.totalGampong}</div>
                    <p className="text-[11px] text-[#718096]">Posko KKM terdata</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#718096] uppercase tracking-wide">Mahasiswa</span>
                      <Users className="w-4 h-4 text-[#0F5132]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#1A202C]">{stats.totalMahasiswa}</div>
                    <p className="text-[11px] text-[#718096]">Peserta KKM aktif</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#718096] uppercase tracking-wide">DPL</span>
                      <UserCheck className="w-4 h-4 text-[#0F5132]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#0F5132]">{stats.totalDpl}</div>
                    <p className="text-[11px] text-[#718096]">Dosen pembimbing</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F8F9FA] border border-[#E2E8F0] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#718096] uppercase tracking-wide">Laporan</span>
                      <FileText className="w-4 h-4 text-[#0F5132]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#1A202C]">{stats.totalLaporan}</div>
                    <p className="text-[11px] text-[#718096]">Berkas terunggah</p>
                  </div>
                </div>
              </div>

              {/* Quick Gampong Preview */}
              <div className="academic-card p-4 sm:p-6 rounded-xl bg-white border border-[#E2E8F0] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-[#1A202C] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#0F5132]" />
                    Preview Gampong Terbaru
                  </h3>
                  <button onClick={() => setActiveTab("gampong")} className="btn-secondary text-xs py-1.5 px-3">
                    Lihat Semua Gampong
                  </button>
                </div>
                {gampongDetails.length === 0 ? (
                  <p className="text-xs text-[#A0AEC0] py-6 text-center">Belum ada data gampong.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {gampongDetails.slice(0, 4).map((gd) => (
                      <div key={gd.gampong.nama} className="p-4 rounded-lg border border-[#E2E8F0] bg-[#F8F9FA] space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-sm text-[#1A202C]">{gd.gampong.nama}</h4>
                            <p className="text-[11px] text-[#718096]">{gd.gampong.kecamatan} • {gd.gampong.skema}</p>
                          </div>
                          <span className="badge-academic text-[10px] shrink-0">{gd.totalMahasiswa} Mhs</span>
                        </div>
                        <div className="text-xs text-[#4A5568] space-y-0.5">
                          <div>Posko: <strong>{gd.gampong.posko}</strong></div>
                          <div>DPL: <strong className="text-[#0F5132]">{gd.dplNama || "-"}</strong></div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] bg-white border border-[#E2E8F0] rounded px-2 py-1">{gd.totalLaporan} Laporan</span>
                          <span className="text-[11px] bg-white border border-[#E2E8F0] rounded px-2 py-1">{gd.mahasiswas.filter(m=>m.isKetuaKelompok===1).length} Ketua</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MONITORING GAMPONG - Utama */}
          {activeTab === "gampong" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-[#1A202C] flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#0F5132]" />
                    Monitoring per Gampong
                  </h2>
                  <p className="text-xs text-[#718096] mt-1">Klik gampong untuk melihat mahasiswa, DPL dan laporan per mahasiswa.</p>
                </div>
                <span className="badge-academic text-xs self-start sm:self-auto">{filteredGampongDetails.length} Gampong Ditemukan</span>
              </div>

              {filteredGampongDetails.length === 0 ? (
                <div className="academic-card p-8 text-center rounded-xl bg-white border border-[#E2E8F0]">
                  <MapPin className="w-10 h-10 text-[#CBD5E1] mx-auto mb-2" />
                  <p className="text-sm text-[#718096]">Tidak ada gampong sesuai pencarian.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredGampongDetails.map((gd) => {
                    const isExpanded = expandedGampong === gd.gampong.nama;
                    return (
                      <div key={gd.gampong.nama} className="academic-card rounded-xl bg-white border border-[#E2E8F0] overflow-hidden">
                        {/* Gampong Header */}
                        <button
                          onClick={() => setExpandedGampong(isExpanded ? null : gd.gampong.nama)}
                          className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#F8F9FA] transition-colors text-left"
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-lg bg-[#0F5132] text-white flex items-center justify-center shrink-0">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-extrabold text-sm sm:text-base text-[#1A202C] truncate">{gd.gampong.nama}</h3>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <span className="text-[11px] bg-[#E6F4EA] text-[#0F5132] border border-[#B7E1CD] px-2 py-0.5 rounded font-semibold">{gd.gampong.kecamatan}</span>
                                <span className="text-[11px] bg-[#F8F9FA] border border-[#E2E8F0] px-2 py-0.5 rounded">{gd.gampong.skema}</span>
                                <span className="text-[11px] text-[#718096]">Posko: {gd.gampong.posko}</span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className="inline-flex items-center gap-1 text-[11px] bg-white border border-[#CBD5E1] rounded-full px-2.5 py-1">
                                  <Users className="w-3 h-3 text-[#0F5132]" /> {gd.totalMahasiswa} Mahasiswa
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] bg-white border border-[#CBD5E1] rounded-full px-2.5 py-1">
                                  <FileText className="w-3 h-3 text-[#0F5132]" /> {gd.totalLaporan} Laporan
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="text-right hidden sm:block">
                              <div className="text-[11px] text-[#718096]">DPL Pembimbing</div>
                              <div className="text-xs font-bold text-[#0F5132]">{gd.dplNama || "Belum Ditentukan"}</div>
                              {gd.dpl?.nidn && <div className="text-[10px] font-mono text-[#718096]">NIDN: {gd.dpl.nidn}</div>}
                            </div>
                            <div className="sm:hidden text-right">
                              <div className="text-[11px] font-bold text-[#0F5132] truncate max-w-[120px]">{gd.dplNama || "-"}</div>
                            </div>
                            {isExpanded ? <ChevronUp className="w-5 h-5 text-[#718096]" /> : <ChevronDown className="w-5 h-5 text-[#718096]" />}
                          </div>
                        </button>

                        {/* Expanded Detail */}
                        {isExpanded && (
                          <div className="border-t border-[#E2E8F0] bg-[#F8F9FA] p-4 sm:p-6 space-y-6">
                            {/* DPL Card */}
                            <div className="bg-white rounded-lg border border-[#E2E8F0] p-4">
                              <h4 className="text-xs font-extrabold uppercase tracking-wide text-[#718096] mb-3 flex items-center gap-2">
                                <UserCheck className="w-4 h-4 text-[#0F5132]" /> DPL Penanggung Jawab
                              </h4>
                              {gd.dpl ? (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#0F5132] text-white flex items-center justify-center font-bold">
                                      {gd.dpl.nama.charAt(0)}
                                    </div>
                                    <div>
                                      <div className="font-bold text-sm text-[#1A202C]">{gd.dpl.nama}</div>
                                      <div className="text-xs text-[#718096]">NIDN: {gd.dpl.nidn} • {gd.dpl.fakultas}</div>
                                      {gd.dpl.email && <div className="text-xs text-[#4A5568]">{gd.dpl.email}</div>}
                                    </div>
                                  </div>
                                  {gd.dpl.noHp && (
                                    <span className="text-xs bg-[#E6F4EA] border border-[#B7E1CD] text-[#0F5132] px-3 py-1.5 rounded-full self-start sm:self-auto">
                                      {gd.dpl.noHp}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-[#718096]">DPL untuk gampong ini belum ditentukan.</div>
                              )}
                              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded p-2.5">
                                  <div className="text-[#718096] text-[11px]">Keuchik</div>
                                  <div className="font-bold text-[#1A202C] truncate">{gd.gampong.keuchik || "-"}</div>
                                </div>
                                <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded p-2.5">
                                  <div className="text-[#718096] text-[11px]">Kontak Keuchik</div>
                                  <div className="font-bold text-[#1A202C] truncate">{gd.gampong.kontakKeuchik || "-"}</div>
                                </div>
                                <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded p-2.5">
                                  <div className="text-[#718096] text-[11px]">Kuota</div>
                                  <div className="font-bold text-[#1A202C]">{gd.gampong.kuota || 0} mahasiswa</div>
                                </div>
                                <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded p-2.5">
                                  <div className="text-[#718096] text-[11px]">Skema</div>
                                  <div className="font-bold text-[#0F5132]">{gd.gampong.skema}</div>
                                </div>
                              </div>
                            </div>

                            {/* Mahasiswa List */}
                            <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 space-y-3">
                              <h4 className="text-xs font-extrabold uppercase tracking-wide text-[#718096] flex items-center justify-between">
                                <span className="flex items-center gap-2"><Users className="w-4 h-4 text-[#0F5132]" /> Daftar Mahasiswa di Gampong Ini ({gd.mahasiswas.length})</span>
                              </h4>
                              {gd.mahasiswas.length === 0 ? (
                                <p className="text-xs text-[#A0AEC0] py-4 text-center bg-[#F8F9FA] rounded border border-dashed">Belum ada mahasiswa terdaftar di gampong ini.</p>
                              ) : (
                                <div className="space-y-3">
                                  {gd.mahasiswas.map((m) => {
                                    const lapMhs = laporanByNpm.get(m.npm) || [];
                                    const isMhsExpanded = expandedNpm === m.npm;
                                    return (
                                      <div key={m.npm} className="border border-[#E2E8F0] rounded-lg overflow-hidden">
                                        <button
                                          onClick={() => setExpandedNpm(isMhsExpanded ? null : m.npm)}
                                          className="w-full p-3 flex items-center justify-between gap-3 hover:bg-[#F8F9FA] text-left"
                                        >
                                          <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-8 h-8 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center shrink-0 overflow-hidden">
                                              {m.foto ? (
                                                <Image src={m.foto} alt={m.nama} width={32} height={32} className="w-8 h-8 object-cover" />
                                              ) : (
                                                <span className="text-xs font-bold text-[#0F5132]">{m.nama.charAt(0)}</span>
                                              )}
                                            </div>
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs sm:text-sm text-[#1A202C] truncate">{m.nama}</span>
                                                {m.isKetuaKelompok === 1 && <span className="text-[9px] bg-[#0F5132] text-white px-1.5 py-0.5 rounded font-bold">KETUA</span>}
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${m.status === "Terverifikasi" ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>{m.status}</span>
                                              </div>
                                              <div className="text-[11px] text-[#718096] truncate">NPM: {m.npm} • {m.prodi} • {m.fakultas}</div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-[#E6F4EA] border border-[#B7E1CD] text-[#0F5132] px-2 py-1 rounded-full">
                                              <FileText className="w-3 h-3" /> {lapMhs.length} Laporan
                                            </span>
                                            <span className="sm:hidden text-[11px] bg-[#F8F9FA] border border-[#E2E8F0] px-2 py-1 rounded-full">{lapMhs.length} Laporan</span>
                                            {isMhsExpanded ? <ChevronUp className="w-4 h-4 text-[#718096]" /> : <ChevronDown className="w-4 h-4 text-[#718096]" />}
                                          </div>
                                        </button>

                                        {isMhsExpanded && (
                                          <div className="border-t border-[#E2E8F0] bg-[#F8F9FA] p-3 space-y-2">
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                              <div><span className="text-[#718096]">Program:</span> <strong>{m.program}</strong></div>
                                              <div><span className="text-[#718096]">Angkatan:</span> <strong>{m.prodi}</strong></div>
                                              <div><span className="text-[#718096]">IPK:</span> <strong>{m.ipk || "-"}</strong></div>
                                              <div><span className="text-[#718096]">Posko:</span> <strong>{m.posko}</strong></div>
                                            </div>
                                            <div className="pt-2">
                                              <h5 className="text-xs font-bold text-[#1A202C] mb-2 flex items-center gap-1.5">
                                                <FileCheck className="w-3.5 h-3.5 text-[#0F5132]" /> Laporan Mahasiswa {m.nama} ({lapMhs.length})
                                              </h5>
                                              {lapMhs.length === 0 ? (
                                                <p className="text-xs text-[#A0AEC0] bg-white border border-dashed rounded p-3 text-center">Belum ada laporan dari mahasiswa ini.</p>
                                              ) : (
                                                <div className="space-y-2">
                                                  {lapMhs.map((lap) => (
                                                    <div key={lap.id} className="bg-white border border-[#E2E8F0] rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                      <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                          <span className="font-bold text-xs text-[#1A202C]">{lap.jenis}</span>
                                                          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${lap.status === "Disetujui DPL" ? "bg-green-50 border-green-200 text-green-700" : lap.status === "Perlu Revisi" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-gray-50 border-gray-200 text-gray-700"}`}>{lap.status}</span>
                                                        </div>
                                                        <div className="text-[11px] text-[#718096] break-all">File: <strong className="text-[#2D3748]">{lap.namaFile}</strong> • {formatFileSize(lap.fileSize)} • {lap.tanggalUpload}</div>
                                                        {lap.catatanDpl && <div className="text-[11px] bg-amber-50 border border-amber-200 text-amber-800 rounded px-2 py-1 mt-1">Catatan DPL: {lap.catatanDpl}</div>}
                                                      </div>
                                                      <div className="flex gap-2 shrink-0">
                                                        <a href={lap.fileUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1">
                                                          <Download className="w-3.5 h-3.5 text-[#0F5132]" /> Unduh
                                                        </a>
                                                        <a href={lap.fileUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs py-1.5 px-2">
                                                          <ExternalLink className="w-3.5 h-3.5" />
                                                        </a>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MAHASISWA GLOBAL */}
          {activeTab === "mahasiswa" && (
            <div className="academic-card p-4 sm:p-6 rounded-xl bg-white border border-[#E2E8F0] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-[#1A202C] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0F5132]" /> Daftar Mahasiswa Keseluruhan
                </h3>
                <span className="badge-academic text-xs">{filteredProfiles.length} Mahasiswa</span>
              </div>
              {filteredProfiles.length === 0 ? (
                <p className="text-xs text-[#A0AEC0] py-8 text-center">Tidak ada mahasiswa sesuai pencarian.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0] text-[#718096] uppercase font-bold text-[10px]">
                        <th className="py-3 px-3">Mahasiswa</th>
                        <th className="py-3 px-3">Gampong / Posko</th>
                        <th className="py-3 px-3">DPL</th>
                        <th className="py-3 px-3">Laporan</th>
                        <th className="py-3 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {filteredProfiles.map((p) => {
                        const cnt = (laporanByNpm.get(p.npm) || []).length;
                        return (
                          <tr key={p.npm} className="hover:bg-[#F8F9FA]/60">
                            <td className="py-3 px-3">
                              <div className="font-bold text-[#1A202C]">{p.nama}</div>
                              <div className="text-[10px] font-mono text-[#718096]">NPM: {p.npm}</div>
                              <div className="text-[11px] text-[#718096]">{p.prodi}</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-[#1A202C]">{p.gampong || "-"}</div>
                              <div className="text-[11px] text-[#718096]">{p.posko || "-"}</div>
                            </td>
                            <td className="py-3 px-3 text-[#0F5132] font-semibold">{p.dpl || "-"}</td>
                            <td className="py-3 px-3">
                              <span className="badge-academic text-[11px]">{cnt} Berkas</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`text-[10px] px-2 py-1 rounded border font-bold whitespace-nowrap ${p.status === "Terverifikasi" ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>{p.status || "Menunggu"}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* LAPORAN REKAP */}
          {activeTab === "laporan" && (
            <div className="academic-card p-4 sm:p-6 rounded-xl bg-white border border-[#E2E8F0] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-[#1A202C] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0F5132]" /> Rekap Laporan per Mahasiswa & Gampong
                </h3>
                <span className="badge-academic text-xs">{filteredLaporans.length} Berkas</span>
              </div>
              {filteredLaporans.length === 0 ? (
                <p className="text-xs text-[#A0AEC0] py-8 text-center">Belum ada laporan sesuai pencarian.</p>
              ) : (
                <div className="divide-y divide-[#E2E8F0] -mx-4 sm:mx-0">
                  {filteredLaporans.map((lap) => {
                    const mhs = profiles.find((p) => p.npm === lap.npm);
                    return (
                      <div key={lap.id} className="py-4 px-4 sm:px-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-[#1A202C]">{lap.jenis}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${lap.status === "Disetujui DPL" ? "bg-green-50 border-green-200 text-green-700" : lap.status === "Perlu Revisi" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-gray-50 border-gray-200 text-gray-700"}`}>{lap.status}</span>
                          </div>
                          <div className="text-xs text-[#4A5568] mt-1">
                            <span className="font-semibold text-[#1A202C]">{mhs?.nama || lap.npm}</span> <span className="text-[#718096]">• NPM {lap.npm} • {mhs?.gampong || "-"}</span>
                          </div>
                          <div className="text-[11px] text-[#718096] break-all">File: <strong>{lap.namaFile}</strong> • {formatFileSize(lap.fileSize)} • {lap.tanggalUpload}</div>
                        </div>
                        <a href={lap.fileUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs py-1.5 px-3 shrink-0 inline-flex items-center gap-1.5 self-start sm:self-center">
                          <Download className="w-3.5 h-3.5 text-[#0F5132]" /> Unduh
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* DPL LIST */}
          {activeTab === "dpl" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-[#1A202C] flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#0F5132]" /> Daftar Dosen Pembimbing Lapangan
                </h3>
                <span className="badge-academic text-xs">{filteredDpls.length} DPL</span>
              </div>
              {filteredDpls.length === 0 ? (
                <p className="text-xs text-[#A0AEC0] py-8 text-center academic-card bg-white rounded-xl p-6">Tidak ada DPL sesuai pencarian.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDpls.map((dpl) => {
                    const gampongDpl = gampongDetails.filter((gd) => gd.dplNama === dpl.nama);
                    const mahasiswaDpl = profiles.filter((p) => p.dpl === dpl.nama);
                    return (
                      <div key={dpl.nidn} className="academic-card p-4 sm:p-5 rounded-xl bg-white border border-[#E2E8F0] space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#0F5132] text-white flex items-center justify-center font-bold shrink-0">
                            {dpl.nama.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-[#1A202C]">{dpl.nama}</h4>
                            <div className="text-xs text-[#718096]">NIDN: {dpl.nidn} • {dpl.fakultas}</div>
                            <div className="text-xs text-[#4A5568]">{dpl.skema}{dpl.kecamatan ? ` • ${dpl.kecamatan}` : ""}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg p-2">
                            <div className="text-lg font-extrabold text-[#0F5132]">{gampongDpl.length}</div>
                            <div className="text-[10px] text-[#718096] uppercase font-bold">Gampong</div>
                          </div>
                          <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg p-2">
                            <div className="text-lg font-extrabold text-[#1A202C]">{mahasiswaDpl.length}</div>
                            <div className="text-[10px] text-[#718096] uppercase font-bold">Mahasiswa</div>
                          </div>
                          <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg p-2">
                            <div className="text-lg font-extrabold text-[#1A202C]">{gampongDpl.reduce((acc, g) => acc + g.totalLaporan, 0)}</div>
                            <div className="text-[10px] text-[#718096] uppercase font-bold">Laporan</div>
                          </div>
                        </div>
                        {gampongDpl.length > 0 && (
                          <div className="pt-2 border-t border-[#E2E8F0]">
                            <div className="text-[11px] font-bold text-[#718096] uppercase mb-1">Gampong Binaan</div>
                            <div className="flex flex-wrap gap-1.5">
                              {gampongDpl.map((g) => (
                                <span key={g.gampong.nama} className="text-[11px] bg-[#E6F4EA] border border-[#B7E1CD] text-[#0F5132] px-2 py-1 rounded-full font-semibold">
                                  {g.gampong.nama}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function LppmPortal() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" /></div>}>
      <LppmContent />
    </Suspense>
  );
}
