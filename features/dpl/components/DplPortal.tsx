"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { handlePrintCard } from "@/lib/printHelper";
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  MapPin,
  Users,
  FileText,
  ArrowLeft,
  ShieldCheck,
  MessageSquare,
  Download,
  Loader2,
  ExternalLink,
  Menu,
} from "lucide-react";

import DplSidebar, { type DplTab } from "./DplSidebar";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import { getErrorMessage } from "@/lib/client-error";
import { useVisibilityPolling } from "@/hooks/use-visibility-polling";
import type {
  DplLogbookRecord as LogbookRecord,
  DplLaporanRecord as LaporanRecord,
  DplProfileRecord,
  DplStudentProfileRecord as StudentProfileRecord,
} from "../types";

function DplPortalContent() {
  const router = useRouter();
  const [session, setSession] = useState<{
    nama?: string;
    nidn?: string;
    role?: string;
    fakultas?: string;
    skema?: string;
    email?: string;
    noHp?: string;
    alamat?: string;
    foto?: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<DplTab>("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Real backend data states
  const [dplProfile, setDplProfile] = useState<DplProfileRecord | null>(null);
  const [profileForm, setProfileForm] = useState({
    nama: "",
    nidn: "",
    fakultas: "",
    skema: "",
    kecamatan: "",
    email: "",
    noHp: "",
    alamat: "",
    foto: "",
  });
  const [profileSaveLoading, setProfileSaveLoading] = useState(false);

  const [logbooks, setLogbooks] = useState<LogbookRecord[]>([]);
  const [profiles, setProfiles] = useState<StudentProfileRecord[]>([]);
  const [laporans, setLaporans] = useState<LaporanRecord[]>([]);

  // Selected Logbook Modal Verification
  const [selectedLogbook, setSelectedLogbook] = useState<LogbookRecord | null>(null);
  const [verificationNote, setVerificationNote] = useState("");

  // Filter verifikasi logbook: per mahasiswa bimbingan + per minggu 1/2/3.
  const [dplLogbookStudent, setDplLogbookStudent] = useState<string>("all");
  const [dplLogbookWeek, setDplLogbookWeek] = useState<number>(0);
  const [dplLogbookSearch, setDplLogbookSearch] = useState("");

  // Selected Laporan Modal Verification
  const [selectedLaporan, setSelectedLaporan] = useState<LaporanRecord | null>(null);
  const [laporanNote, setLaporanNote] = useState("");

  useEffect(() => {
    fetch("/api/auth/session?role=dpl")
      .then((res) => res.json())
      .then((resData) => {
        if (!resData.success || !resData.session || resData.session.role !== "dpl") {
          router.push("/dpl/login");
          return;
        }
        const s = resData.session;
        setSession(s);

        // On mount, isLoading is already true, so we can fetch directly to avoid synchronous state update in effect
        fetch("/api/dpl/data")
          .then((res) => {
            if (res.status === 401 || res.status === 403) {
              router.push("/dpl/login");
              return null;
            }
            return res.json();
          })
          .then((dplData) => {
            if (!dplData) return;
            if (dplData.success && dplData.data) {
              setLogbooks(dplData.data.logbooks || []);
              setProfiles(dplData.data.profiles || []);
              setLaporans(dplData.data.laporans || []);
            }
          })
          .catch((err) => {
            console.error("Error fetching DPL data", err);
          })
          .finally(() => {
            setIsLoading(false);
          });

        if (s?.nidn) {
          fetch(`/api/dpl/profile?nidn=${encodeURIComponent(s.nidn)}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                setDplProfile(data.profile);
                setProfileForm({
                  nama: data.profile.nama || "",
                  nidn: data.profile.nidn || s.nidn,
                  fakultas: data.profile.fakultas || "",
                  skema: data.profile.skema || "",
                  kecamatan: data.profile.kecamatan || "",
                  email: data.profile.email || "",
                  noHp: data.profile.noHp || "",
                  alamat: data.profile.alamat || "",
                  foto: data.profile.foto || "",
                });
              }
            })
            .catch((error) => {
              console.error("Error fetching DPL profile", error);
            });
        }
      })
      .catch((err) => {
        console.error("Error fetching DPL session", err);
        setIsLoading(false);
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error", err);
    }
    router.push("/dpl/login");
  };

  const handleToggleKetuaKelompok = async (npm: string, currentStatus?: number) => {
    const nextIsKetua = currentStatus !== 1;
    try {
      const res = await fetch("/api/dpl/set-ketua", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npm, isKetua: nextIsKetua }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengubah status ketua.");
      }

      // Update local profiles state
      setProfiles((prev) =>
        prev.map((p) => (p.npm === npm ? { ...p, isKetuaKelompok: nextIsKetua ? 1 : 0 } : p))
      );
    } catch (err) {
      alert(getErrorMessage(err, "Gagal mengubah status ketua."));
    }
  };

  // Verification action handler for Logbooks
  const handleVerify = async (logbookId: number, status: "Disetujui DPL" | "Perlu Revisi") => {
    try {
      const note = verificationNote || (status === "Disetujui DPL" ? "Aktivitas terverifikasi dan sesuai program." : "Mohon lengkapi detail deskripsi.");
      const res = await fetch("/api/dpl/verify-logbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: logbookId, status, catatanDpl: note }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memperbarui status logbook.");
      }

      setLogbooks((prev) =>
        prev.map((item) => (item.id === logbookId ? { ...item, status, catatanDpl: note } : item))
      );
      setSelectedLogbook(null);
      setVerificationNote("");
      alert(`Status logbook berhasil diubah menjadi: ${status}`);
    } catch (err) {
      alert(getErrorMessage(err, "Gagal memverifikasi logbook."));
    }
  };

  // Verification action handler for Laporans
  const handleVerifyLaporan = async (laporanId: number, status: "Disetujui DPL" | "Perlu Revisi") => {
    try {
      const note = laporanNote || (status === "Disetujui DPL" ? "Laporan disetujui DPL pembimbing." : "Mohon revisi sesuai petunjuk.");
      const res = await fetch("/api/dpl/verify-laporan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: laporanId, status, catatanDpl: note }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memperbarui status berkas laporan.");
      }

      setLaporans((prev) =>
        prev.map((item) => (item.id === laporanId ? { ...item, status, catatanDpl: note } : item))
      );
      setSelectedLaporan(null);
      setLaporanNote("");
      alert(`Status berkas laporan berhasil diubah menjadi: ${status}`);
    } catch (err) {
      alert(getErrorMessage(err, "Gagal memverifikasi berkas laporan."));
    }
  };

  const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profileForm.nidn || !profileForm.nama || !profileForm.fakultas || !profileForm.skema) {
      alert("Mohon lengkapi nama, NIDN, fakultas, dan skema.");
      return;
    }

    setProfileSaveLoading(true);
    try {
      const res = await fetch("/api/dpl/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan profil DPL.");
      }

      const savedProfile = data.profile;
      setDplProfile(savedProfile);
      setProfileForm((prev) => ({
        ...prev,
        nama: savedProfile.nama || prev.nama,
        fakultas: savedProfile.fakultas || prev.fakultas,
        skema: savedProfile.skema || prev.skema,
        kecamatan: savedProfile.kecamatan || prev.kecamatan,
        email: savedProfile.email || prev.email,
        noHp: savedProfile.noHp || prev.noHp,
        alamat: savedProfile.alamat || prev.alamat,
        foto: savedProfile.foto || prev.foto,
      }));
      setSession((prev) => ({
        ...(prev || {}),
        email: savedProfile.email,
        noHp: savedProfile.noHp,
        alamat: savedProfile.alamat,
        foto: savedProfile.foto,
      }));
      if (profileForm.nidn) {
        await loadDplProfile(profileForm.nidn);
      }
      alert("Profil DPL berhasil diperbarui.");
    } catch (err) {
      alert(getErrorMessage(err, "Gagal menyimpan profil DPL."));
    } finally {
      setProfileSaveLoading(false);
    }
  };

  const handleUploadPhoto = async (file: File) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "profile_photo");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengunggah foto.");
      }

      const nextPhoto = data.fileUrl;
      const saveRes = await fetch("/api/dpl/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profileForm,
          nidn: profileForm.nidn || session?.nidn || "",
          nama: profileForm.nama || session?.nama || "",
          fakultas: profileForm.fakultas || session?.fakultas || "",
          skema: profileForm.skema || session?.skema || "",
          foto: nextPhoto,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok || !saveData.success) {
        throw new Error(saveData.error || "Gagal menyimpan foto profil ke database.");
      }

      setProfileForm((prev) => ({ ...prev, foto: nextPhoto }));
      setDplProfile((prev) => (prev ? { ...prev, foto: nextPhoto } : prev));
      setSession((prev) => (prev ? { ...prev, foto: nextPhoto } : prev));
      alert("Foto profil berhasil diperbarui.");
    } catch (err) {
      alert(getErrorMessage(err, "Gagal mengunggah foto."));
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "1.2 MB";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const loadDplData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch("/api/dpl/data");
      const resData = await res.json();
      if (resData.success && resData.data) {
        setLogbooks(resData.data.logbooks || []);
        setProfiles(resData.data.profiles || []);
        setLaporans(resData.data.laporans || []);
      }
    } catch (err) {
      const errName = (err as { name?: string } | null)?.name;
      if (errName === "AbortError" || errName === "TimeoutError") return;
      console.error("Error fetching DPL data", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useVisibilityPolling(() => loadDplData(true));

  const loadDplProfile = async (nidn: string) => {
    const res = await fetch(`/api/dpl/profile?nidn=${encodeURIComponent(nidn)}`);
    const data = await res.json();
    if (data.success) {
      setDplProfile(data.profile);
      setProfileForm({
        nama: data.profile.nama || "",
        nidn: data.profile.nidn || nidn,
        fakultas: data.profile.fakultas || "",
        skema: data.profile.skema || "",
        kecamatan: data.profile.kecamatan || "",
        email: data.profile.email || "",
        noHp: data.profile.noHp || "",
        alamat: data.profile.alamat || "",
        foto: data.profile.foto || "",
      });
    }
  };


  const dplNama = dplProfile?.nama || session?.nama || "";
  const dplNidn = dplProfile?.nidn || session?.nidn || "";
  const dplFakultas = dplProfile?.fakultas || session?.fakultas || "Fakultas Ilmu Komputer (FIKOM)";
  const dplSkema = dplProfile?.skema || session?.skema || "";
  const dplEmail = dplProfile?.email || session?.email || "";
  const dplNoHp = dplProfile?.noHp || session?.noHp || "";
  const dplAlamat = dplProfile?.alamat || session?.alamat || "";
  const displayPhoto = profileForm.foto || dplProfile?.foto || session?.foto || "";

  // DPL only sees and manages students, logbooks, and reports under their responsibility/supervision
  const filteredProfiles = profiles.filter((p) => p.dpl === dplNama);
  const myStudentsNpms = new Set(filteredProfiles.map((p) => p.npm));
  const filteredLogbooks = logbooks.filter((b) => myStudentsNpms.has(b.npm));
  const filteredLaporans = laporans.filter((lap) => myStudentsNpms.has(lap.npm));

  // Grouping: one DPL can supervise more than one gampong
  const npmToGampong = new Map(filteredProfiles.map((p) => [p.npm, p.gampong || "Tanpa Gampong"]));
  const npmToProfile = new Map(filteredProfiles.map((p) => [p.npm, p]));
  const dplLogbookWeekOf = (b: LogbookRecord) => (b.minggu && b.minggu >= 1 && b.minggu <= 3 ? b.minggu : 1);

  // Logbooks per mahasiswa bimbingan + per minggu 1/2/3 (yang ditentukan admin via penempatan DPL).
  const dplVisibleLogbooks = filteredLogbooks.filter((b) => {
    if (dplLogbookStudent !== "all" && b.npm !== dplLogbookStudent) return false;
    if (dplLogbookWeek !== 0 && dplLogbookWeekOf(b) !== dplLogbookWeek) return false;
    if (dplLogbookSearch.trim()) {
      const q = dplLogbookSearch.trim().toLowerCase();
      const prof = npmToProfile.get(b.npm);
      const hay = `${b.npm} ${b.judul} ${prof?.nama || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const dplLogbooksByStudent = new Map<string, LogbookRecord[]>();
  for (const b of dplVisibleLogbooks) {
    if (!dplLogbooksByStudent.has(b.npm)) dplLogbooksByStudent.set(b.npm, []);
    dplLogbooksByStudent.get(b.npm)!.push(b);
  }
  // Tampilkan semua mahasiswa bimbingan (termasuk yang belum upload),
  // urut abjad agar mudah diverifikasi satu per satu.
  const dplStudentSections = [...filteredProfiles]
    .filter((p) => {
      if (dplLogbookStudent !== "all" && p.npm !== dplLogbookStudent) return false;
      if (dplLogbookSearch.trim()) {
        const q = dplLogbookSearch.trim().toLowerCase();
        if (!`${p.npm} ${p.nama}`.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => a.nama.localeCompare(b.nama))
    .map((p) => ({ profile: p, items: dplLogbooksByStudent.get(p.npm) || [] }));

  const dplWeekCounts = [1, 2, 3].map((w) => ({
    week: w,
    count: filteredLogbooks.filter((b) => dplLogbookWeekOf(b) === w).length,
  }));

  // Laporans grouped by gampong
  const laporanGroups: Array<{ gampong: string; items: LaporanRecord[] }> = [];
  {
    const byGampong = new Map<string, LaporanRecord[]>();
    for (const lap of filteredLaporans) {
      const gampong = npmToGampong.get(lap.npm) || "Tanpa Gampong";
      if (!byGampong.has(gampong)) byGampong.set(gampong, []);
      byGampong.get(gampong)!.push(lap);
    }
    for (const [gampong, items] of byGampong) laporanGroups.push({ gampong, items });
  }

  // Mahasiswa grouped by gampong (per kelompok / per gampong) - untuk daftar bimbingan responsif
  const mahasiswaGroups: Array<{ gampong: string; posko: string; items: StudentProfileRecord[] }> = [];
  {
    const byGampong = new Map<string, StudentProfileRecord[]>();
    for (const p of filteredProfiles) {
      const g = p.gampong?.trim() || "Tanpa Gampong";
      if (!byGampong.has(g)) byGampong.set(g, []);
      byGampong.get(g)!.push(p);
    }
    for (const [gampong, items] of byGampong) {
      const posko = items[0]?.posko || "";
      mahasiswaGroups.push({ gampong, posko, items });
    }
    mahasiswaGroups.sort((a, b) => a.gampong.localeCompare(b.gampong));
  }

  // Ringkasan verifikasi menunggu untuk dashboard
  const pendingLogbooks = filteredLogbooks.filter((b) => b.status !== "Disetujui DPL").length;
  const pendingLaporans = filteredLaporans.filter((lap) => lap.status !== "Disetujui DPL").length;

  const renderLogbookCard = (b: LogbookRecord) => (
    <div key={b.id} className="academic-card rounded-lg bg-white border border-[#CBD5E1] overflow-hidden flex flex-col justify-between">
      <div className="p-4 sm:p-5 space-y-3">
        <div className="relative aspect-[16/9] rounded-md overflow-hidden bg-[#F1F5F9] border border-[#E2E8F0]">
          {b.foto ? (
                            <Image src={b.foto} alt={b.judul} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[11px] text-[#A0AEC0] font-semibold">Tanpa Foto</div>
                          )}
          <div className="absolute top-2 left-2 flex gap-1.5">
            <span className="badge-academic text-[10px] bg-[#1A202C] text-white border-0 font-bold px-2 py-0.5">
              Minggu {dplLogbookWeekOf(b)}
            </span>
            {b.kategori && (
              <span className="badge-academic text-[10px] bg-[#0F5132] text-white border-0 font-bold px-2 py-0.5">
                {b.kategori}
              </span>
            )}
          </div>
          <div className="absolute top-2 right-2 max-w-[60%]">
            <span className="badge-academic text-[10px] bg-white/95 border border-[#CBD5E1] truncate block">
              {b.status}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs text-[#718096]">
          <span className="font-mono">NPM: <strong>{b.npm}</strong></span>
          <span className="bg-white border border-[#E2E8F0] rounded px-1.5 py-0.5 text-[10px] sm:text-xs">{b.tanggal}</span>
        </div>

        <h4 className="font-extrabold text-sm sm:text-base text-[#1A202C] leading-tight break-words">{b.judul}</h4>
        <div className="text-[11px] sm:text-xs text-[#0F5132] font-semibold flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" /> {b.lokasi}</div>
        <p className="text-xs text-[#4A5568] leading-relaxed break-words line-clamp-3 sm:line-clamp-none">{b.deskripsi}</p>

        {b.catatanDpl && (
          <div className="text-[11px] text-[#0F5132] bg-[#E6F4EA] p-2.5 rounded border border-[#B7E1CD] font-medium break-words">
            Catatan DPL: {b.catatanDpl}
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 bg-[#F8F9FA] border-t border-[#E2E8F0] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <button
          onClick={() => setSelectedLogbook(b)}
          className="btn-primary text-xs py-2 sm:py-1.5 px-3 flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto"
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Verifikasi / Beri Catatan</span>
        </button>

        <a href={b.foto} target="_blank" rel="noreferrer" className="text-[#0F5132] font-bold text-xs hover:underline flex items-center justify-center gap-1 bg-white border border-[#CBD5E1] rounded-md py-2 sm:py-1.5 px-3 w-full sm:w-auto">
          <span>Foto HD</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );

  const renderLaporanRow = (lap: LaporanRecord) => {
    const isWord = lap.namaFile?.endsWith(".doc") || lap.namaFile?.endsWith(".docx") || lap.fileType?.includes("word");
    return (
      <div key={lap.id} className="py-4 px-1 sm:px-0 flex flex-col gap-3 sm:flex-row sm:items-start justify-between sm:gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${isWord ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-red-50 border-red-200 text-red-700"}`}>
            <FileText className="w-5 h-5 shrink-0" />
          </div>

          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h5 className="font-extrabold text-sm text-[#1A202C] leading-tight break-words">{lap.jenis}</h5>
              <span className="badge-academic text-[10px] shrink-0 whitespace-nowrap">{lap.status}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-x-3 sm:gap-y-1 text-[11px] sm:text-xs text-[#718096] min-w-0">
              <span className="font-mono shrink-0">NPM: <strong className="text-[#1A202C]">{lap.npm}</strong></span>
              <span className="hidden sm:inline text-[#CBD5E1]">•</span>
              <span className="break-all min-w-0 leading-relaxed">Nama File: <strong className="text-[#1A202C] break-all">{lap.namaFile}</strong></span>
              <span className="hidden sm:inline text-[#CBD5E1]">•</span>
              <span className="inline-flex gap-1 shrink-0"><span>Ukuran:</span> <strong className="text-[#1A202C]">{formatFileSize(lap.fileSize)}</strong></span>
              <span className="hidden sm:inline text-[#CBD5E1]">•</span>
              <span className="shrink-0">Diunggah: {lap.tanggalUpload}</span>
            </div>
            {lap.catatanDpl && (
              <div className="text-[11px] text-[#0F5132] bg-[#E6F4EA] p-2 rounded border border-[#B7E1CD] font-medium mt-1 break-words">
                Catatan DPL: {lap.catatanDpl}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto self-stretch sm:self-start shrink-0 ml-[52px] sm:ml-0">
          <a
            href={lap.fileUrl}
            target="_blank"
            download
            rel="noreferrer"
            className="btn-secondary text-xs py-2 sm:py-1.5 px-3 flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
          >
            <Download className="w-3.5 h-3.5 text-[#0F5132] shrink-0" />
            <span>Unduh</span>
          </a>
          <button
            onClick={() => setSelectedLaporan(lap)}
            className="btn-primary text-xs py-2 sm:py-1.5 px-3 flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-none"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Verifikasi</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A202C]">
      <DplSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={{
          logbook: filteredLogbooks.length,
          laporan: filteredLaporans.length,
          mahasiswa: filteredProfiles.length,
        }}
        session={session}
        displayPhoto={displayPhoto}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onLogout={handleLogout}
      />

      <div className={`${isSidebarCollapsed ? "md:ml-20" : "md:ml-64"} min-w-0 transition-all duration-300`}>
        <main className="dashboard-page mx-auto max-w-7xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-8 lg:px-8">

          {/* Top Bar - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-[#E2E8F0] pb-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsMobileOpen(true)}
                className="btn-secondary p-2 md:hidden cursor-pointer shrink-0"
                aria-label="Buka menu navigasi"
              >
                <Menu className="w-4 h-4 text-[#0F5132]" />
              </button>

              <Link href="/" className="btn-secondary min-w-0 shrink-0 px-2.5 py-2 text-xs shadow-xs sm:px-3">
                <ArrowLeft className="w-4 h-4 text-[#0F5132] shrink-0" />
                <span className="hidden sm:inline">Kembali ke Portal Utama</span>
                <span className="sm:hidden">Portal</span>
              </Link>

              <span className="badge-academic text-xs font-bold bg-[#E6F4EA] text-[#0F5132] border-[#B7E1CD] hidden lg:inline-flex">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0F5132]" />
                Role: Dosen Pembimbing Lapangan (DPL)
              </span>
            </div>

          </div>

          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <>
              {/* DPL Banner Header */}
        <div className="academic-card p-4 sm:p-6 lg:p-8 rounded-xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
              {displayPhoto ? (
                <Image
                  src={displayPhoto}
                  alt={`Foto ${dplNama || "DPL"}`}
                  width={56}
                  height={56}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-[#E2E8F0] shadow-sm shrink-0"
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#0F5132] text-white flex items-center justify-center font-extrabold text-xl sm:text-2xl shrink-0 shadow-sm">
                  {dplNama.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-[#1A202C] leading-tight">{dplNama}</h1>
                  <span className="badge-academic text-[10px] whitespace-nowrap shrink-0">NIDN: {dplNidn || "0012057801"}</span>
                </div>
                <p className="text-[11px] sm:text-xs text-[#718096] mt-1 leading-relaxed break-words">
                  {dplFakultas} • {dplSkema ? `${dplSkema} • ` : ""}DPL Pembimbing Lapangan KKM UMuslim
                </p>
                <div className="mt-3 text-sm text-[#4A5568] space-y-1">
                  {dplNoHp && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#0F5132]" />
                      <span>{dplNoHp}</span>
                    </div>
                  )}
                  {dplAlamat && (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-[#0F5132]" />
                      <span>{dplAlamat}</span>
                    </div>
                  )}
                  {dplEmail && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-3.5 h-3.5 text-[#0F5132]" />
                      <span>{dplEmail}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* DPL Metrics - Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-1">
            <div className="p-3 sm:p-3.5 rounded-lg bg-[#F8F9FA] border border-[#E2E8F0]">
              <span className="text-[11px] text-[#718096] font-medium block">Mahasiswa Bimbingan</span>
              <span className="text-lg sm:text-xl font-extrabold text-[#1A202C] block mt-1">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#0F5132]" /> : filteredProfiles.length} Mahasiswa
              </span>
            </div>

            <div className="p-3 sm:p-3.5 rounded-lg bg-[#F8F9FA] border border-[#E2E8F0]">
              <span className="text-[11px] text-[#718096] font-medium block">Total Logbook Harian</span>
              <span className="text-lg sm:text-xl font-extrabold text-[#0F5132] block mt-1">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#0F5132]" /> : filteredLogbooks.length} Entries
              </span>
            </div>

            <div className="p-3 sm:p-3.5 rounded-lg bg-[#F8F9FA] border border-[#E2E8F0]">
              <span className="text-[11px] text-[#718096] font-medium block">Berkas Laporan Terunggah</span>
              <span className="text-lg sm:text-xl font-extrabold text-[#1A202C] block mt-1">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#0F5132]" /> : filteredLaporans.length} Dokumen
              </span>
            </div>
          </div>
        </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-sm text-[#1A202C]">Aksi Cepat</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {([
                    {
                      id: "logbook",
                      label: "Verifikasi Logbook",
                      desc: `${filteredLogbooks.length} entri logbook mahasiswa bimbingan`,
                      badge: pendingLogbooks,
                      icon: <FileText className="w-5 h-5 text-[#0F5132]" />,
                    },
                    {
                      id: "laporan",
                      label: "Berkas Laporan",
                      desc: `${filteredLaporans.length} dokumen laporan terunggah`,
                      badge: pendingLaporans,
                      icon: <Download className="w-5 h-5 text-[#0F5132]" />,
                    },
                    {
                      id: "mahasiswa",
                      label: "Mahasiswa Bimbingan",
                      desc: `${filteredProfiles.length} mahasiswa di bawah bimbingan Anda`,
                      icon: <Users className="w-5 h-5 text-[#0F5132]" />,
                    },
                    {
                      id: "profil",
                      label: "Profil & Kartu DPL",
                      desc: "Kelola biodata dan cetak kartu identitas",
                      icon: <UserCheck className="w-5 h-5 text-[#0F5132]" />,
                    },
                  ] as Array<{ id: DplTab; label: string; desc: string; badge?: number; icon: React.ReactNode }>).map((action) => (
                    <button
                      key={action.id}
                      onClick={() => setActiveTab(action.id)}
                      className="academic-card p-4 rounded-xl bg-white border border-[#CBD5E1] text-left hover:border-[#0F5132] hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#E6F4EA] flex items-center justify-center shrink-0">
                          {action.icon}
                        </div>
                        {typeof action.badge === "number" && action.badge > 0 && (
                          <span className="badge-academic text-[10px] bg-[#FDF6E7] text-amber-700 border-amber-200 shrink-0">
                            {action.badge} perlu review
                          </span>
                        )}
                      </div>
                      <h4 className="mt-3 font-extrabold text-sm text-[#1A202C]">{action.label}</h4>
                      <p className="text-xs text-[#718096] mt-0.5 leading-relaxed">{action.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

        {/* TAB 1: VERIFIKASI LOGBOOK PER MAHASISWA PER MINGGU 1/2/3 */}
        {activeTab === "logbook" && (
          <div className="academic-card p-4 sm:p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-sm sm:text-base text-[#1A202C] leading-tight">Verifikasi Logbook per Mahasiswa — Minggu 1 / 2 / 3</h3>
                <p className="text-[11px] sm:text-xs text-[#718096] mt-1 leading-relaxed">Semua mahasiswa bimbingan Anda (ditentukan admin) tampil di sini. Pilih mahasiswa lalu periksa logbook Minggu 1, Minggu 2, dan Minggu 3 satu per satu.</p>
              </div>
              <span className="badge-academic text-xs self-start sm:self-auto shrink-0 whitespace-nowrap">{filteredLogbooks.length} Logbook Terdata • {filteredProfiles.length} Mahasiswa</span>
            </div>

            {/* Filter: mahasiswa + minggu + cari */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <label className="block">
                <span className="text-[10px] font-bold text-[#4A5568] uppercase tracking-wide">Mahasiswa bimbingan</span>
                <select
                  value={dplLogbookStudent}
                  onChange={(e) => setDplLogbookStudent(e.target.value)}
                  className="mt-1 w-full rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-semibold text-[#1A202C]"
                >
                  <option value="all">Semua mahasiswa ({filteredProfiles.length})</option>
                  {[...filteredProfiles].sort((a, b) => a.nama.localeCompare(b.nama)).map((p) => (
                    <option key={p.npm} value={p.npm}>{p.nama} — {p.npm}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-[#4A5568] uppercase tracking-wide">Cari nama / NPM / judul</span>
                <input
                  value={dplLogbookSearch}
                  onChange={(e) => setDplLogbookSearch(e.target.value)}
                  placeholder="Contoh: Ahmad / 2106... / UMKM"
                  className="mt-1 w-full rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#1A202C]"
                />
              </label>
              <div>
                <span className="text-[10px] font-bold text-[#4A5568] uppercase tracking-wide">Filter minggu</span>
                <div className="mt-1 grid grid-cols-4 gap-1">
                  {[{ v: 0, label: "Semua" }, ...dplWeekCounts.map((w) => ({ v: w.week, label: `M${w.week} (${w.count})` }))].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setDplLogbookWeek(opt.v)}
                      className={`rounded-md px-2 py-2 text-[11px] font-bold transition ${dplLogbookWeek === opt.v ? "bg-[#0F5132] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredProfiles.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-xs text-[#718096] space-y-2">
                <FileText className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                <p>Belum ada mahasiswa bimbingan. Admin yang menentukan mahasiswa untuk setiap DPL.</p>
              </div>
            ) : dplStudentSections.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-xs text-[#718096] space-y-2">
                <FileText className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                <p>Tidak ada mahasiswa yang cocok dengan filter.</p>
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                {dplStudentSections.map(({ profile, items }) => {
                  const w1 = items.filter((b) => dplLogbookWeekOf(b) === 1);
                  const w2 = items.filter((b) => dplLogbookWeekOf(b) === 2);
                  const w3 = items.filter((b) => dplLogbookWeekOf(b) === 3);
                  const pending = items.filter((b) => b.status !== "Disetujui DPL").length;
                  return (
                    <div key={profile.npm} className="space-y-3 sm:space-y-4 rounded-lg border border-[#E2E8F0] p-3 sm:p-4">
                      <div className="flex items-center gap-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg px-3 sm:px-4 py-2.5">
                        <MapPin className="w-4 h-4 text-[#0F5132] shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-sm text-[#1A202C] truncate">{profile.nama} <span className="font-mono font-normal text-[#718096]">• {profile.npm}</span></h4>
                          <p className="text-[11px] text-[#718096] truncate">{profile.gampong || "Tanpa Gampong"}{profile.posko ? ` • Posko: ${profile.posko}` : ""}</p>
                        </div>
                        <span className="badge-academic text-[10px] shrink-0 whitespace-nowrap ml-auto">
                          M1:{w1.length} • M2:{w2.length} • M3:{w3.length}{pending > 0 ? ` • ${pending} perlu review` : " • lengkap"}
                        </span>
                      </div>

                      {([1, 2, 3] as const).filter((w) => dplLogbookWeek === 0 || dplLogbookWeek === w).map((w) => {
                        const list = w === 1 ? w1 : w === 2 ? w2 : w3;
                        return (
                          <div key={w} className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                              <UserCheck className="w-3.5 h-3.5 text-[#718096] shrink-0" />
                              <h5 className="text-xs font-extrabold uppercase tracking-wide text-[#718096]">Logbook Minggu {w}</h5>
                              <span className="text-[10px] font-bold text-[#718096]">({list.length})</span>
                            </div>
                            {list.length === 0 ? (
                              <p className="text-[11px] text-[#A0AEC0] italic pl-1">Belum ada logbook Minggu {w} dari mahasiswa ini.</p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                {list.map(renderLogbookCard)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BERKAS LAPORAN REALTIME - Responsive */}
        {activeTab === "laporan" && (
          <div className="academic-card p-4 sm:p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-sm sm:text-base text-[#1A202C] leading-tight">Berkas Laporan Pengabdian (PDF &amp; Word)</h3>
                <p className="text-[11px] sm:text-xs text-[#718096] mt-1 leading-relaxed">Daftar file laporan yang telah diunggah mahasiswa bimbingan, dikelompokkan per gampong.</p>
              </div>
              <span className="badge-academic text-xs self-start sm:self-auto shrink-0 whitespace-nowrap">{filteredLaporans.length} Berkas Laporan</span>
            </div>

            {laporanGroups.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-xs text-[#718096] space-y-2">
                <FileText className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                <p>Belum ada berkas laporan yang diunggah.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {laporanGroups.map((group) => (
                  <div key={group.gampong} className="space-y-2">
                    {/* Gampong Group Header - Responsive */}
                    <div className="flex items-center gap-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg px-3 sm:px-4 py-2.5">
                      <MapPin className="w-4 h-4 text-[#0F5132] shrink-0" />
                      <h4 className="font-extrabold text-sm text-[#1A202C] truncate min-w-0 flex-1">{group.gampong}</h4>
                      <span className="badge-academic text-[10px] shrink-0 whitespace-nowrap ml-auto">
                        {group.items.length} Berkas
                      </span>
                    </div>

                    <div className="divide-y divide-[#E2E8F0] border-b border-[#E2E8F0] -mx-1 sm:mx-0">
                      {group.items.map(renderLaporanRow)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PROFIL DPL - Responsive */}
        {activeTab === "profil" && (
          <div className="academic-card p-4 sm:p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-4 shadow-xs">
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
              <div className="flex-1 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] p-4 sm:p-5">
                <div className="flex items-center gap-4 mb-4">
                  {displayPhoto ? (
                    <Image
                      src={displayPhoto}
                      alt={`Foto ${dplNama || "DPL"}`}
                      width={56}
                      height={56}
                      className="w-14 h-14 rounded-xl object-cover border border-[#E2E8F0]"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-[#0F5132] text-white flex items-center justify-center font-extrabold text-2xl">
                      {dplNama.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-extrabold text-lg text-[#1A202C]">Profil DPL</h3>
                    <p className="text-xs text-[#718096]">Kelola biodata personal dan cetak kartu identitas DPL.</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-[#2D3748]">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold w-28">Nama</span>
                    <span>{dplProfile?.nama || session?.nama || "-"}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold w-28">NIDN</span>
                    <span>{dplProfile?.nidn || session?.nidn || "-"}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold w-28">Fakultas</span>
                    <span>{dplProfile?.fakultas || session?.fakultas || "-"}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold w-28">Skema</span>
                    <span>{dplProfile?.skema || session?.skema || "-"}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold w-28">Email</span>
                    <span>{dplProfile?.email || session?.email || "-"}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold w-28">No. HP</span>
                    <span>{dplProfile?.noHp || session?.noHp || "-"}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold w-28">Alamat</span>
                    <span>{dplProfile?.alamat || session?.alamat || "-"}</span>
                  </div>
                </div>

                <div className="pt-5 space-y-4">
                  <div className="flex flex-col items-center justify-center border border-[#CBD5E1] rounded-lg bg-[#F8F9FA] p-4">
                    <p className="text-[10px] font-semibold text-[#718096] mb-2 text-center">QR Code Identitas DPL</p>
                    {dplProfile?.nidn ? (
                      <Image
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/dpl/login?ref=${dplProfile.nidn}`)}`}
                        alt="QR Code DPL"
                        width={96}
                        height={96}
                        className="w-24 h-24 border border-[#E2E8F0] rounded-md"
                        unoptimized
                      />
                    ) : (
                      <div className="w-24 h-24 bg-[#E2E8F0] rounded-md flex items-center justify-center text-[11px] text-[#718096]">
                        Belum ada NIDN
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!dplProfile}
                    onClick={() => dplProfile && handlePrintCard({
                      nama: dplProfile.nama,
                      nidn: dplProfile.nidn,
                      fakultas: dplProfile.fakultas,
                      skema: dplProfile.skema,
                      kecamatan: dplProfile.kecamatan,
                      email: dplProfile.email,
                      noHp: dplProfile.noHp,
                      alamat: dplProfile.alamat,
                      foto: dplProfile.foto,
                    })}
                    className="btn-primary text-xs py-2 px-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center"
                  >
                    <Download className="w-4 h-4" />
                    <span>Cetak Kartu DPL (dengan QR Code)</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 rounded-xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
                <h3 className="font-extrabold text-sm sm:text-base text-[#1A202C] mb-4">Edit Biodata DPL</h3>
                <form onSubmit={handleProfileSave} className="space-y-4 text-xs text-[#4A5568]">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[10px] font-semibold text-[#4A5568]">Nama Lengkap</span>
                      <input
                        value={profileForm.nama}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, nama: event.target.value }))}
                        className="w-full mt-1 text-sm rounded-md border border-[#CBD5E1] p-2"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-semibold text-[#4A5568]">NIDN</span>
                      <input
                        value={profileForm.nidn}
                        disabled
                        className="w-full mt-1 text-sm rounded-md border border-[#E2E8F0] bg-[#F8F9FA] p-2 text-[#718096]"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[10px] font-semibold text-[#4A5568]">Fakultas</span>
                      <input
                        value={profileForm.fakultas}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, fakultas: event.target.value }))}
                        className="w-full mt-1 text-sm rounded-md border border-[#CBD5E1] p-2"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-semibold text-[#4A5568]">Skema KKM</span>
                      <input
                        value={profileForm.skema}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, skema: event.target.value }))}
                        className="w-full mt-1 text-sm rounded-md border border-[#CBD5E1] p-2"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[10px] font-semibold text-[#4A5568]">Kecamatan</span>
                      <input
                        value={profileForm.kecamatan}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, kecamatan: event.target.value }))}
                        className="w-full mt-1 text-sm rounded-md border border-[#CBD5E1] p-2"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-semibold text-[#4A5568]">Email</span>
                      <input
                        value={profileForm.email}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                        className="w-full mt-1 text-sm rounded-md border border-[#CBD5E1] p-2"
                        type="email"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[10px] font-semibold text-[#4A5568]">No. HP</span>
                      <input
                        value={profileForm.noHp}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, noHp: event.target.value }))}
                        className="w-full mt-1 text-sm rounded-md border border-[#CBD5E1] p-2"
                      />
                    </label>
                    <ChangePasswordDialog endpoint="/api/dpl/password" />
                  </div>

                  <label className="block">
                    <span className="text-[10px] font-semibold text-[#4A5568]">Alamat</span>
                    <textarea
                      rows={3}
                      value={profileForm.alamat}
                      onChange={(event) => setProfileForm((prev) => ({ ...prev, alamat: event.target.value }))}
                      className="w-full mt-1 text-sm rounded-md border border-[#CBD5E1] p-2"
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-end">
                    <label className="block">
                      <span className="text-[10px] font-semibold text-[#4A5568]">Foto Profil</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) handleUploadPhoto(file);
                        }}
                        className="w-full mt-1 text-sm rounded-md border border-[#CBD5E1] p-2 bg-white"
                      />
                    </label>
                    <div className="space-y-2">
                      {profileForm.foto && (
                        <Image
                          src={profileForm.foto}
                          alt="Preview Foto DPL"
                          width={150}
                          height={96}
                          className="h-24 w-full rounded-md object-cover border border-[#E2E8F0]"
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={profileSaveLoading}
                      className="btn-primary text-xs py-2 px-4 flex items-center gap-2"
                    >
                      {profileSaveLoading ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (dplProfile) {
                          setProfileForm({
                            nama: dplProfile.nama || "",
                            nidn: dplProfile.nidn || "",
                            fakultas: dplProfile.fakultas || "",
                            skema: dplProfile.skema || "",
                            kecamatan: dplProfile.kecamatan || "",
                            email: dplProfile.email || "",
                            noHp: dplProfile.noHp || "",
                            alamat: dplProfile.alamat || "",
                            foto: dplProfile.foto || "",
                          });
                        }
                      }}
                      className="btn-secondary text-xs py-2 px-4"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MAHASISWA BIMBINGAN - PER KELOMPOK / PER GAMPONG - Responsive */}
        {activeTab === "mahasiswa" && (
          <div className="academic-card p-4 sm:p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-sm sm:text-base text-[#1A202C] leading-tight">Daftar Mahasiswa Bimbingan KKM</h3>
                <p className="text-[11px] sm:text-xs text-[#718096] mt-1 leading-relaxed">Dikelompokkan per gampong / kelompok posko. Total {mahasiswaGroups.length} kelompok • {filteredProfiles.length} mahasiswa.</p>
              </div>
              <span className="badge-academic text-xs self-start sm:self-auto shrink-0 whitespace-nowrap">{filteredProfiles.length} Mahasiswa Bimbingan</span>
            </div>

            {filteredProfiles.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#718096] space-y-2">
                <Users className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                <p>Belum ada mahasiswa bimbingan yang terdaftar.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {mahasiswaGroups.map((group) => (
                  <div key={group.gampong} className="space-y-3">
                    {/* Group Header per Gampong */}
                    <div className="flex items-center gap-2 sm:gap-3 bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg px-3 sm:px-4 py-2.5 sm:py-3">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#0F5132] text-white flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-sm text-[#1A202C] truncate">{group.gampong}</h4>
                        <p className="text-[11px] text-[#718096] truncate">Posko: {group.posko || "-"} • {group.items.length} anggota</p>
                      </div>
                      <span className="badge-academic text-[10px] sm:text-xs shrink-0 whitespace-nowrap">{group.items.length} Mahasiswa</span>
                    </div>

                    {/* Desktop Table - hidden on mobile */}
                    <div className="hidden sm:block overflow-x-auto border border-[#E2E8F0] rounded-lg">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0] text-[#718096] uppercase font-bold text-[10px]">
                            <th className="py-3 px-4">Mahasiswa</th>
                            <th className="py-3 px-4">Fakultas / Prodi</th>
                            <th className="py-3 px-4">Program KKM</th>
                            <th className="py-3 px-4">Peran Kelompok</th>
                            <th className="py-3 px-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {group.items.map((p) => (
                            <tr key={p.npm} className="hover:bg-[#F8F9FA]/60">
                              <td className="py-3 px-4 font-bold text-[#1A202C]">
                                <div className="truncate max-w-[180px]">{p.nama}</div>
                                <span className="text-[10px] text-[#718096] font-normal font-mono">NPM: {p.npm}</span>
                              </td>
                              <td className="py-3 px-4 text-[#4A5568]">
                                <div className="truncate max-w-[160px]">{p.fakultas}</div>
                                <span className="text-[10px] text-[#718096]">{p.prodi}</span>
                              </td>
                              <td className="py-3 px-4 font-semibold text-[#0F5132]">{p.program}</td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => handleToggleKetuaKelompok(p.npm, p.isKetuaKelompok)}
                                  className={`py-1 px-2.5 rounded font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                                    p.isKetuaKelompok === 1
                                      ? "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                                      : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                                  }`}
                                >
                                  <span>{p.isKetuaKelompok === 1 ? "👑 Ketua Kelompok" : "Set Ketua"}</span>
                                </button>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="badge-academic text-[10px] bg-[#E6F4EA] text-[#0F5132] border-[#B7E1CD] whitespace-nowrap">
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards - visible on mobile */}
                    <div className="grid grid-cols-1 gap-3 sm:hidden">
                      {group.items.map((p) => (
                        <div key={p.npm} className="bg-white border border-[#CBD5E1] rounded-xl p-3.5 space-y-3 shadow-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="w-9 h-9 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                                <span className="text-xs font-extrabold text-[#0F5132]">{p.nama.charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-sm text-[#1A202C] leading-tight truncate">{p.nama}</div>
                                <div className="text-[11px] font-mono text-[#718096]">NPM: {p.npm}</div>
                                <div className="text-xs text-[#4A5568] mt-1 leading-tight">{p.prodi}</div>
                                <div className="text-[11px] text-[#718096] truncate">{p.fakultas}</div>
                              </div>
                            </div>
                            <span className="badge-academic text-[10px] bg-[#E6F4EA] text-[#0F5132] border-[#B7E1CD] shrink-0 whitespace-nowrap">{p.status}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg p-2.5">
                              <span className="text-[10px] text-[#718096] font-medium block">Program KKM</span>
                              <span className="text-xs font-bold text-[#0F5132] block truncate">{p.program}</span>
                            </div>
                            <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg p-2.5">
                              <span className="text-[10px] text-[#718096] font-medium block">Posko / Lokasi</span>
                              <span className="text-xs font-bold text-[#1A202C] block truncate">{p.posko || p.gampong || "-"}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleToggleKetuaKelompok(p.npm, p.isKetuaKelompok)}
                              className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                p.isKetuaKelompok === 1
                                  ? "bg-amber-500 text-white border border-amber-600 shadow-xs"
                                  : "bg-white text-[#4A5568] border border-[#CBD5E1] hover:border-[#0F5132] hover:text-[#0F5132]"
                              }`}
                            >
                              <span>{p.isKetuaKelompok === 1 ? "👑 Ketua Kelompok" : "Jadikan Ketua"}</span>
                            </button>
                          </div>
                          {p.isKetuaKelompok === 1 && (
                            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 text-center font-medium">
                              Ketua kelompok gampong {group.gampong} — laporan & logbook kelompok akan atas nama mahasiswa ini.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Verification DPL - Responsive */}
        {selectedLogbook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="academic-card p-4 sm:p-6 rounded-lg bg-white border border-[#CBD5E1] max-w-md w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] pb-3">
                <h3 className="text-sm sm:text-base font-bold text-[#1A202C] leading-tight">Formulir Verifikasi DPL</h3>
                <button onClick={() => setSelectedLogbook(null)} className="text-xs text-[#718096] hover:text-[#1A202C] shrink-0 bg-[#F1F5F9] px-2.5 py-1.5 rounded-md">✕</button>
              </div>

              <div className="space-y-2 text-xs break-words">
                <div><span className="text-[#718096]">Kegiatan</span>: <strong className="break-words">{selectedLogbook.judul}</strong></div>
                <div><span className="text-[#718096]">Mahasiswa (NPM)</span>: <strong>{selectedLogbook.npm}</strong></div>
                <div><span className="text-[#718096]">Tanggal</span>: {selectedLogbook.tanggal}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2D3748] mb-1">Catatan / Masukan DPL Pembimbing</label>
                <textarea
                  rows={3}
                  placeholder="Berikan masukan atau catatan revisi untuk mahasiswa..."
                  value={verificationNote}
                  onChange={(e) => setVerificationNote(e.target.value)}
                  className="w-full p-2.5 rounded-md academic-input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleVerify(selectedLogbook.id!, "Perlu Revisi")}
                  className="btn-secondary w-1/2 py-2 text-xs justify-center text-amber-700 border-amber-300 hover:bg-amber-50 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Perlu Revisi</span>
                </button>

                <button
                  onClick={() => handleVerify(selectedLogbook.id!, "Disetujui DPL")}
                  className="btn-primary w-1/2 py-2 text-xs justify-center cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Setujui Logbook</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Verification Laporan DPL - Responsive */}
        {selectedLaporan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="academic-card p-4 sm:p-6 rounded-lg bg-white border border-[#CBD5E1] max-w-md w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] pb-3">
                <h3 className="text-sm sm:text-base font-bold text-[#1A202C] leading-tight">Formulir Verifikasi Laporan</h3>
                <button onClick={() => setSelectedLaporan(null)} className="text-xs text-[#718096] hover:text-[#1A202C] cursor-pointer shrink-0 bg-[#F1F5F9] px-2.5 py-1.5 rounded-md">✕</button>
              </div>

              <div className="space-y-2 text-xs break-words">
                <div><span className="text-[#718096]">Berkas Laporan</span>: <strong className="break-words">{selectedLaporan.jenis}</strong></div>
                <div><span className="text-[#718096]">Mahasiswa (NPM)</span>: <strong>{selectedLaporan.npm}</strong></div>
                <div><span className="text-[#718096]">Nama File</span>: <span className="break-all">{selectedLaporan.namaFile}</span></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2D3748] mb-1">Catatan / Evaluasi DPL Pembimbing</label>
                <textarea
                  rows={3}
                  placeholder="Berikan masukan atau catatan revisi untuk laporan..."
                  value={laporanNote}
                  onChange={(e) => setLaporanNote(e.target.value)}
                  className="w-full p-2.5 rounded-md academic-input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleVerifyLaporan(selectedLaporan.id!, "Perlu Revisi")}
                  className="btn-secondary w-1/2 py-2 text-xs justify-center text-amber-700 border-amber-300 hover:bg-amber-50 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Perlu Revisi</span>
                </button>

                <button
                  onClick={() => handleVerifyLaporan(selectedLaporan.id!, "Disetujui DPL")}
                  className="btn-primary w-1/2 py-2 text-xs justify-center cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Setujui Laporan</span>
                </button>
              </div>
            </div>
          </div>
        )}

        </main>
      </div>
    </div>
  );
}

export default function DplPortal() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F9FA] text-[#1A202C] flex items-center justify-center">Memuat Portal DPL Pembimbing...</div>}>
      <DplPortalContent />
    </Suspense>
  );
}
