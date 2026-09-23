"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  Hash,
  Building,
  BookOpen,
  Calendar,
  MapPin,
  CheckCircle2,
  Plus,
  Users,
  FileText,
  ArrowLeft,
  GraduationCap,
  ShieldCheck,
  Download,
  Upload,
  Clock,
  FileCheck,
  FileSpreadsheet,
  Loader2,
  ExternalLink,
  Menu,
  TriangleAlert,
} from "lucide-react";
import { handlePrintCard } from "@/lib/printHelper";
import QRCode from "qrcode";
import Swal from "sweetalert2";
import MahasiswaSidebar, { type MahasiswaTab } from "./MahasiswaSidebar";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import { getErrorMessage } from "@/lib/client-error";
import { useVisibilityPolling } from "@/hooks/use-visibility-polling";
import type { LaporanBerkas, LogbookEntry, StudentProfile } from "../types";
import {
  areAllDocumentsVerified as checkAllDocumentsVerified,
  getDocumentRepairList,
  hasPendingDocumentReview,
  isDocumentSubmissionRejected,
  parseDocumentReviews,
} from "../utils/document-review";

// Batas panjang isian logbook (karakter). Diselaraskan dengan validasi
// backend di lib/api-validation.ts agar error panjang tidak pernah lolos
// ke pengguna sebagai pesan mentah.
const MIN_KARAKTER_JUDUL = 3;
const MAX_KARAKTER_JUDUL = 200;
const MIN_KARAKTER_DESKRIPSI = 10;
const MAX_KARAKTER_DESKRIPSI = 5000;
const MIN_KARAKTER_CAPAIAN = 10;
const MAX_KARAKTER_CAPAIAN = 5000;

// Tampilan SweetAlert2 premium untuk alur Logbook: menyatu dengan desain
// aplikasi (hijau #0F5132, radius 20px, shadow lembut, animasi halus).
const LOGBOOK_SWAL_CSS = `
.lb-swal-container{backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);}
.lb-swal-popup{border-radius:20px !important;padding:2rem 1.75rem 1.6rem !important;width:min(30rem,calc(100vw - 2.5rem)) !important;box-shadow:0 24px 70px -12px rgba(15,81,50,.28),0 10px 28px -10px rgba(26,32,44,.22) !important;font-family:inherit;}
.lb-swal-popup .swal2-icon{margin:0 auto 1rem !important;transform:scale(1.05);}
.lb-swal-title{font-size:1.2rem !important;font-weight:800 !important;color:#1A202C !important;line-height:1.4 !important;padding:0 !important;margin-bottom:.5rem !important;}
.lb-swal-text{font-size:.875rem !important;line-height:1.7 !important;color:#4A5568 !important;margin:0 !important;}
.lb-swal-btn{background-color:#0F5132 !important;color:#fff !important;border:none !important;border-radius:12px !important;padding:.8rem 2.25rem !important;font-size:.875rem !important;font-weight:700 !important;box-shadow:0 10px 22px -8px rgba(15,81,50,.55) !important;transition:transform .15s ease,box-shadow .15s ease,background-color .15s ease !important;cursor:pointer;}
.lb-swal-btn:hover{background-color:#0C4229 !important;transform:translateY(-1px);}
.lb-swal-btn:active{transform:translateY(0);}
.lb-swal-btn:focus{box-shadow:0 0 0 3px rgba(15,81,50,.25) !important;}
.lb-swal-count{margin-top:1rem;background:#F8F9FA;border:1px solid #E2E8F0;border-radius:14px;padding:.9rem 1rem;text-align:left;}
.lb-swal-quote{font-size:.8rem;color:#1A202C;background:#fff;border:1px dashed #CBD5E1;border-radius:10px;padding:.55rem .7rem;margin-bottom:.7rem;word-break:break-word;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
.lb-swal-count-row{display:flex;align-items:center;justify-content:space-between;gap:.5rem;font-size:.78rem;color:#718096;font-weight:600;}
.lb-swal-count-row strong{color:#0F5132;font-weight:800;background:#E6F4EA;border:1px solid #B7E1CD;padding:.2rem .6rem;border-radius:999px;font-size:.75rem;white-space:nowrap;}
.lb-swal-count-row strong.over{color:#B91C1C;background:#FEF2F2;border-color:#FECACA;}
.lb-swal-bar{height:8px;background:#E2E8F0;border-radius:999px;margin-top:.6rem;overflow:hidden;}
.lb-swal-fill{display:block;height:100%;background:linear-gradient(90deg,#0F5132,#2F855A);border-radius:999px;transition:width .3s ease;}
.lb-swal-fill.over{background:linear-gradient(90deg,#DC2626,#F87171);}
.lb-swal-hint{margin-top:.55rem;font-size:.78rem;font-weight:700;color:#B7791F;}
.lb-swal-hint.over{color:#B91C1C;}
.lb-swal-checks{margin-top:1rem;display:grid;gap:.5rem;}
.lb-swal-check{display:flex;align-items:center;gap:.55rem;background:#E6F4EA;border:1px solid #B7E1CD;color:#0F5132;font-size:.8rem;font-weight:700;border-radius:12px;padding:.6rem .8rem;text-align:left;}
.lb-swal-detail{display:block;margin-top:.7rem;font-size:.72rem;color:#A0AEC0;}
@keyframes lbSwalPop{from{opacity:0;transform:translateY(14px) scale(.96);}to{opacity:1;transform:none;}}
@keyframes lbSwalFade{from{opacity:1;}to{opacity:0;transform:scale(.97);}}
.lb-swal-show{animation:lbSwalPop .32s cubic-bezier(.22,.9,.32,1.2);}
.lb-swal-hide{animation:lbSwalFade .18s ease-in;}
@media (max-width:480px){.lb-swal-popup{padding:1.6rem 1.2rem 1.4rem !important;}.lb-swal-title{font-size:1.05rem !important;}}
`;

let logbookSwalStyleInjected = false;
function ensureLogbookSwalStyle() {
  if (typeof document === "undefined" || logbookSwalStyleInjected) return;
  if (document.getElementById("logbook-swal-style")) {
    logbookSwalStyleInjected = true;
    return;
  }
  const el = document.createElement("style");
  el.id = "logbook-swal-style";
  el.textContent = LOGBOOK_SWAL_CSS;
  document.head.appendChild(el);
  logbookSwalStyleInjected = true;
}

function escapeSwalHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Konfigurasi dasar semua SweetAlert alur Logbook: backdrop gelap lembut,
// animasi masuk/keluar halus, tombol sesuai desain aplikasi.
const logbookSwalBase = {
  customClass: {
    container: "lb-swal-container",
    popup: "lb-swal-popup",
    title: "lb-swal-title",
    htmlContainer: "lb-swal-text",
    confirmButton: "lb-swal-btn",
  },
  buttonsStyling: false,
  backdrop: "rgba(26, 32, 44, 0.55)",
  showClass: { popup: "lb-swal-show" },
  hideClass: { popup: "lb-swal-hide" },
  allowOutsideClick: false,
  // Fokus dikelola manual (focusLogbookField) agar cursor tepat di akhir teks.
  returnFocus: false,
};

// Kartu informasi jumlah karakter di dalam SweetAlert validasi.
function charCountCardHtml(current: number, min: number, max: number, quote: string): string {
  const isOver = current > max;
  const pct = isOver ? 100 : Math.min(100, Math.round((current / min) * 100));
  const diff = isOver ? current - max : min - current;
  const shown = quote.length > 140 ? `${quote.slice(0, 140)}…` : quote;
  return `<div class="lb-swal-count">`
    + `<div class="lb-swal-quote">&ldquo;${escapeSwalHtml(shown) || "-"}&rdquo;</div>`
    + `<div class="lb-swal-count-row"><span>Jumlah karakter saat ini</span><strong class="${isOver ? "over" : ""}">${current} dari ${isOver ? `maksimal ${max}` : `minimal ${min}`} karakter</strong></div>`
    + `<div class="lb-swal-bar"><span class="lb-swal-fill${isOver ? " over" : ""}" style="width:${pct}%"></span></div>`
    + `<div class="lb-swal-hint${isOver ? " over" : ""}">${isOver ? `Kurangi minimal ${diff} karakter lagi agar catatan dapat disimpan.` : `Silakan tambahkan minimal ${diff} karakter lagi agar catatan kegiatan dapat disimpan.`}</div>`
    + `</div>`;
}

function StudentPortalContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MahasiswaTab>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Start with null; profile is fetched from the API on mount.
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [verificationQr, setVerificationQr] = useState("");
  const [logbooks, setLogbooks] = useState<LogbookEntry[]>([]);
  const [groupLogbooks, setGroupLogbooks] = useState<LogbookEntry[]>([]);
  const [laporans, setLaporans] = useState<LaporanBerkas[]>([]);
  const [groupLaporans, setGroupLaporans] = useState<LaporanBerkas[]>([]);
  const [anggotaGampong, setAnggotaGampong] = useState<string | null>(null);
  const [anggotaKkmSemester, setAnggotaKkmSemester] = useState<string | null>(null);
  const [anggotaList, setAnggotaList] = useState<Array<{ npm: string; nama: string; prodi: string; fakultas: string; kkmSemester: string; isKetua: boolean }>>([]);
  const [isKetuaSaya, setIsKetuaSaya] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLogbookId, setEditingLogbookId] = useState<number | null>(null);
  const [revisingLaporan, setRevisingLaporan] = useState<LaporanBerkas | null>(null);
  const [revisingLaporanFile, setRevisingLaporanFile] = useState<File | null>(null);
  const [isSubmittingLaporanRevision, setIsSubmittingLaporanRevision] = useState(false);
  const [canUploadBerkas, setCanUploadBerkas] = useState(false);
  const [isBerkasUploadEnabled, setIsBerkasUploadEnabled] = useState(false);
  const [isProfileEditEnabled, setIsProfileEditEnabled] = useState(false);
  const [berkasUrls, setBerkasUrls] = useState<{ slipPembayaran: string; slipSpp: string; transkrip: string; krs: string; pasFoto: string; asuransiJiwa: string }>({ slipPembayaran: "", slipSpp: "", transkrip: "", krs: "", pasFoto: "", asuransiJiwa: "" });
  const [berkasUploading, setBerkasUploading] = useState<Record<string, boolean>>({});
  const [isSubmittingBerkas, setIsSubmittingBerkas] = useState(false);
  const hasLoadedInitialData = useRef(false);
  const profileRefreshState = useRef({ isLoading: false, lastCompletedAt: 0 });


  // Form Logbook State
  const [newEntry, setNewEntry] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    judul: "",
    lokasi: "Meunasah Gampong",
    deskripsi: "",
    capaianAkhir: "",
    foto: "",
    kategori: "Mandiri",
  });
  const [logbookSubTab, setLogbookSubTab] = useState<"mandiri" | "kelompok">("mandiri");
  const [activeLogbookWeek, setActiveLogbookWeek] = useState<number | null>(null);
  const [selectedLogbookWeek, setSelectedLogbookWeek] = useState(1);

  // Logbook kelompok milik sendiri + unggahan ketua untuk satu gampong yang sama.
  const visibleKelompokLogbooks: LogbookEntry[] = [
    ...logbooks.filter((b) => b.kategori === "Kelompok"),
    ...groupLogbooks,
  ];
  const logbookWeek = (entry: LogbookEntry) => entry.minggu || 1;
  const selectedMandiriLogbooks = logbooks.filter((entry) =>
    logbookWeek(entry) === selectedLogbookWeek && (entry.kategori === "Mandiri" || !entry.kategori)
  );
  const selectedKelompokLogbooks = visibleKelompokLogbooks.filter((entry) => logbookWeek(entry) === selectedLogbookWeek);
  // Tab Minggu 1/2/3 tetap dapat dibuka untuk melihat data lama.
  // Upload hanya tersedia pada minggu yang sedang dibuka admin.
  const isLogbookUploadOpen = activeLogbookWeek === selectedLogbookWeek;

  // Laporan milik sendiri + dokumen kelompok yang diunggah ketua (tampil untuk semua anggota gampong).
  const visibleLaporans: LaporanBerkas[] = [...laporans, ...groupLaporans].sort((a, b) => b.id - a.id);
  const [logbookPhotoFile, setLogbookPhotoFile] = useState<File | null>(null);
  const [logbookPhotoPreview, setLogbookPhotoPreview] = useState<string>("");
  const [logbookPhoto2File, setLogbookPhoto2File] = useState<File | null>(null);
  const [logbookPhoto2Preview, setLogbookPhoto2Preview] = useState<string>("");
  const [isSubmittingLogbook, setIsSubmittingLogbook] = useState(false);
  // Ref untuk mengembalikan fokus ke field yang gagal validasi.
  // Validasi gagal TIDAK boleh me-reset state — hanya fokus + scroll.
  const judulRef = useRef<HTMLInputElement>(null);
  const deskripsiRef = useRef<HTMLTextAreaElement>(null);
  const capaianRef = useRef<HTMLTextAreaElement>(null);

  // Fokus ke field + scroll smooth + cursor di akhir teks,
  // tanpa mengubah isi form sedikit pun.
  const focusLogbookField = (ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>) => {
    window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {
        /* abaikan: scroll opsional */
      }
      el.focus({ preventScroll: true });
      const len = el.value.length;
      try {
        el.setSelectionRange(len, len);
      } catch {
        /* abaikan: tidak semua input mendukung selection */
      }
    }, 60);
  };

  // Form Upload Laporan (PDF & Word)
  const [newLaporan, setNewLaporan] = useState({
    jenis: "Laporan Mingguan Minggu 1",
  });
  const [laporanDocumentFile, setLaporanDocumentFile] = useState<File | null>(null);
  const [isSubmittingLaporan, setIsSubmittingLaporan] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error", err);
    }
    router.push("/daftar");
  };




  // Muat data dasar terlebih dahulu. Data fitur yang dilindungi hanya diminta
  // setelah seluruh berkas persyaratan diverifikasi admin.
  useEffect(() => {
    if (hasLoadedInitialData.current) return;
    hasLoadedInitialData.current = true;

    let cancelled = false;

    const loadInitialData = async () => {
      try {
        const sessionResponse = await fetch("/api/auth/session?role=mahasiswa");
        const sessionData = await sessionResponse.json();
        if (
          sessionResponse.status === 401 ||
          !sessionData.success ||
          sessionData.session?.role !== "mahasiswa" ||
          !sessionData.session?.npm
        ) {
          if (!cancelled) router.push("/daftar");
          return;
        }

        const currentNpm = String(sessionData.session.npm);
        const encodedNpm = encodeURIComponent(currentNpm);
        const [profileResponse, berkasResponse] = await Promise.all([
          fetch(`/api/mahasiswa/profil?npm=${encodedNpm}`),
          fetch(`/api/mahasiswa/berkas?npm=${encodedNpm}`),
        ]);

        if (profileResponse.status === 401) {
          if (!cancelled) router.push("/daftar");
          return;
        }

        const [profileData, berkasData] = await Promise.all([
          profileResponse.json(),
          berkasResponse.json(),
        ]);
        if (cancelled) return;

        const latestProfile = profileData.success ? profileData.profile : null;
        if (latestProfile) setProfile(latestProfile);
        setIsProfileEditEnabled(Boolean(profileData.editEnabled));

        if (berkasResponse.ok && berkasData.success) {
          setCanUploadBerkas(Boolean(berkasData.canUpload));
          setIsBerkasUploadEnabled(Boolean(berkasData.uploadEnabled));
          if (berkasData.berkas) {
            setBerkasUrls({
              slipPembayaran: berkasData.berkas.slipPembayaran || "",
              slipSpp: berkasData.berkas.slipSpp || "",
              transkrip: berkasData.berkas.transkrip || "",
              krs: berkasData.berkas.krs || "",
              pasFoto: berkasData.berkas.pasFoto || "",
              asuransiJiwa: berkasData.berkas.asuransiJiwa || "",
            });
          }
        }

        const documentReviews = parseDocumentReviews(latestProfile?.catatanVerifikasiBerkas);
        if (!checkAllDocumentsVerified(documentReviews)) return;

        const [logbookResponse, laporanResponse, anggotaResponse] = await Promise.all([
          fetch(`/api/mahasiswa/logbook?npm=${encodedNpm}`),
          fetch(`/api/mahasiswa/laporan?npm=${encodedNpm}`),
          fetch("/api/mahasiswa/anggota"),
        ]);

        if ([logbookResponse, laporanResponse, anggotaResponse].some((response) => response.status === 401)) {
          if (!cancelled) router.push("/daftar");
          return;
        }
        if (cancelled) return;

        if (logbookResponse.ok) {
          const data = await logbookResponse.json();
          setLogbooks(data.success && Array.isArray(data.logbooks) ? data.logbooks : []);
          setGroupLogbooks(Array.isArray(data.groupLogbooks) ? data.groupLogbooks : []);
          const week = Number(data.activeWeek);
          setActiveLogbookWeek(week >= 1 && week <= 3 ? week : null);
          if (week >= 1 && week <= 3) setSelectedLogbookWeek(week);
        }

        if (laporanResponse.ok) {
          const data = await laporanResponse.json();
          setLaporans(data.success && Array.isArray(data.laporans) ? data.laporans : []);
          setGroupLaporans(Array.isArray(data.groupLaporans) ? data.groupLaporans : []);
        }

        if (anggotaResponse.ok) {
          const data = await anggotaResponse.json();
          if (data.success) {
            setAnggotaGampong(data.gampong || null);
            setAnggotaKkmSemester(data.kkmSemester || null);
            setIsKetuaSaya(Boolean(data.isKetua));
            setAnggotaList(Array.isArray(data.anggota) ? data.anggota : []);
          }
        }
      } catch (error) {
        console.error("Error loading student portal data", error);
      }
    };

    void loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const refreshProfile = async (syncBerkasUrls = true, force = false) => {
    const refreshState = profileRefreshState.current;
    const now = Date.now();
    if (refreshState.isLoading || (!force && now - refreshState.lastCompletedAt < 15_000)) {
      return;
    }
    refreshState.isLoading = true;

    try {
      const sessionRes = await fetch("/api/auth/session?role=mahasiswa");
      const sessionData = await sessionRes.json();
      if (!sessionData.success || !sessionData.session?.npm) return;
      const npm = sessionData.session.npm;
      const res = await fetch(`/api/mahasiswa/profil?npm=${encodeURIComponent(npm)}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
      }
      if (data.success) setIsProfileEditEnabled(Boolean(data.editEnabled));
      const berkasRes = await fetch(`/api/mahasiswa/berkas?npm=${encodeURIComponent(npm)}`, { cache: "no-store" });
      const berkasData = await berkasRes.json();
      if (berkasData.success) {
        setCanUploadBerkas(Boolean(berkasData.canUpload));
        setIsBerkasUploadEnabled(Boolean(berkasData.uploadEnabled));
        if (syncBerkasUrls && berkasData.berkas) {
          setBerkasUrls({
            slipPembayaran: berkasData.berkas.slipPembayaran || "",
            slipSpp: berkasData.berkas.slipSpp || "",
            transkrip: berkasData.berkas.transkrip || "",
            krs: berkasData.berkas.krs || "",
            pasFoto: berkasData.berkas.pasFoto || "",
            asuransiJiwa: berkasData.berkas.asuransiJiwa || "",
          });
        }
      }
    } catch (e) {
      console.error("Refresh profile error", e);
    } finally {
      refreshState.isLoading = false;
      refreshState.lastCompletedAt = Date.now();
    }
  };

  // Refresh status saat kembali ke halaman tanpa menimpa pilihan berkas lokal
  // yang belum disimpan. Dialog pemilih file juga memicu event focus.
  useEffect(() => {
    const onFocus = () => {
      if (activeTab === "dashboard") void refreshProfile(false, true);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [activeTab]);

  useVisibilityPolling(() => {
    if (activeTab === "dashboard") return refreshProfile(false, true);
  }, 10_000);

  useEffect(() => {
    if (!profile?.npm) return;
    let cancelled = false;
    QRCode.toDataURL(profile.npm, { width: 300, margin: 1, errorCorrectionLevel: "M" })
      .then((value) => { if (!cancelled) setVerificationQr(value); })
      .catch(() => { if (!cancelled) setVerificationQr(""); });
    return () => { cancelled = true; };
  }, [profile?.npm]);

  // Handle Photo File Select for Logbook
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogbookPhotoFile(file);
      setLogbookPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handlePhoto2Select = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogbookPhoto2File(file);
      setLogbookPhoto2Preview(URL.createObjectURL(file));
    }
  };


  const closeLogbookModal = () => {
    // Menutup form isi logbook tanpa menyimpan: kembali ke Daftar Logbook.
    // State revisi ikut direset agar tidak terbawa ke isian berikutnya.
    setIsModalOpen(false);
    setEditingLogbookId(null);
  };

  const openLogbookModal = () => {
    const isKelompokUpload = logbookSubTab === "kelompok" && Number(profile?.isKetuaKelompok) === 1;
    // Mode tambah baru: pastikan tidak ada sisa state revisi sebelumnya.
    setEditingLogbookId(null);
    setNewEntry({
      tanggal: new Date().toISOString().split("T")[0],
      judul: "",
      lokasi: "Meunasah Gampong",
      deskripsi: "",
      capaianAkhir: "",
      foto: "",
      kategori: isKelompokUpload ? "Kelompok" : "Mandiri",
    });
    setLogbookPhotoFile(null);
    setLogbookPhotoPreview("");
    setLogbookPhoto2File(null);
    setLogbookPhoto2Preview("");

  const openLogbookModal = () => {
    const isKelompokUpload = logbookSubTab === "kelompok" && Number(profile?.isKetuaKelompok) === 1;
    setNewEntry((previous) => ({
      ...previous,
      kategori: isKelompokUpload ? "Kelompok" : "Mandiri",
    }));

    setIsModalOpen(true);
  };

  // Submit Logbook Entry to Backend API & Upload Image (Photos >= 1MB supported)
  // Alur: Isi Logbook → Klik Simpan → Validasi → Backend konfirmasi tersimpan
  // → SweetAlert Sukses → Klik "Lihat Logbook" → tutup form & kembali ke Daftar Logbook.
  // Validasi gagal / penyimpanan gagal → tetap di form isi logbook (tidak redirect).
  const handleAddLogbook = async (e: React.FormEvent) => {
    e.preventDefault();
    // Cegah submit ganda (klik berulang) agar data tidak tersimpan dua kali.
    if (isSubmittingLogbook) return;
    ensureLogbookSwalStyle();
    if (!newEntry.judul.trim() || !newEntry.deskripsi.trim() || !newEntry.capaianAkhir.trim()) {
      await Swal.fire({
        ...logbookSwalBase,
        icon: "warning",
        title: "Data Belum Lengkap",
        text: "Mohon lengkapi judul, deskripsi kegiatan, dan capaian akhir terlebih dahulu agar catatan logbook jelas dan informatif.",
        confirmButtonText: "Perbaiki Catatan",
      });
      // Tetap di form — data tidak diubah — fokus ke field pertama yang kosong.
      if (!newEntry.judul.trim()) focusLogbookField(judulRef);
      else if (!newEntry.deskripsi.trim()) focusLogbookField(deskripsiRef);
      else focusLogbookField(capaianRef);
      return;
    }
    // Validasi panjang 10–5000 karakter (selaras dengan backend): data yang
    // terlalu pendek/panjang TIDAK disimpan dan mahasiswa tetap di form.
    const judulTrimmed = newEntry.judul.trim();
    const deskripsiTrimmed = newEntry.deskripsi.trim();
    const capaianTrimmed = newEntry.capaianAkhir.trim();
    if (judulTrimmed.length < MIN_KARAKTER_JUDUL || judulTrimmed.length > MAX_KARAKTER_JUDUL) {
      const isOver = judulTrimmed.length > MAX_KARAKTER_JUDUL;
      await Swal.fire({
        ...logbookSwalBase,
        icon: "warning",
        title: isOver ? "Judul Terlalu Panjang" : "Judul Terlalu Singkat",
        html: isOver
          ? `Judul kegiatan maksimal ${MAX_KARAKTER_JUDUL} karakter. Silakan ringkas judul Anda sebelum menyimpan.`
            + charCountCardHtml(judulTrimmed.length, MIN_KARAKTER_JUDUL, MAX_KARAKTER_JUDUL, judulTrimmed)
          : `Judul kegiatan minimal ${MIN_KARAKTER_JUDUL} karakter agar mudah dipahami.`
            + charCountCardHtml(judulTrimmed.length, MIN_KARAKTER_JUDUL, MAX_KARAKTER_JUDUL, judulTrimmed),
        confirmButtonText: "Perbaiki Catatan",
      });
      focusLogbookField(judulRef);
      return;
    }
    if (deskripsiTrimmed.length < MIN_KARAKTER_DESKRIPSI) {
      await Swal.fire({
        ...logbookSwalBase,
        icon: "warning",
        title: "Catatan Masih Terlalu Singkat",
        html: `Catatan yang Anda masukkan belum memenuhi jumlah karakter minimum yang diperlukan.`
          + charCountCardHtml(deskripsiTrimmed.length, MIN_KARAKTER_DESKRIPSI, MAX_KARAKTER_DESKRIPSI, deskripsiTrimmed),
        confirmButtonText: "Tambahkan Catatan",
      });
      // Hanya tutup SweetAlert: form, data, dan foto tetap apa adanya,
      // lalu fokus kembali ke textarea Deskripsi (cursor di akhir teks).
      focusLogbookField(deskripsiRef);
      return;
    }
    if (deskripsiTrimmed.length > MAX_KARAKTER_DESKRIPSI) {
      await Swal.fire({
        ...logbookSwalBase,
        icon: "warning",
        title: "Catatan Terlalu Panjang",
        html: `Catatan logbook yang Anda masukkan melebihi batas maksimal ${MAX_KARAKTER_DESKRIPSI} karakter. Silakan ringkas atau perbaiki catatan Anda sebelum melanjutkan proses penyimpanan.`
          + charCountCardHtml(deskripsiTrimmed.length, MIN_KARAKTER_DESKRIPSI, MAX_KARAKTER_DESKRIPSI, deskripsiTrimmed),
        confirmButtonText: "Perbaiki Catatan",
      });
      focusLogbookField(deskripsiRef);
      return;
    }
    if (capaianTrimmed.length < MIN_KARAKTER_CAPAIAN || capaianTrimmed.length > MAX_KARAKTER_CAPAIAN) {
      const isOver = capaianTrimmed.length > MAX_KARAKTER_CAPAIAN;
      await Swal.fire({
        ...logbookSwalBase,
        icon: isOver ? "error" : "warning",
        title: isOver ? "Capaian Terlalu Panjang" : "Capaian Masih Terlalu Singkat",
        html: isOver
          ? `Capaian akhir maksimal ${MAX_KARAKTER_CAPAIAN} karakter. Silakan ringkas tulisan Anda sebelum menyimpan.`
            + charCountCardHtml(capaianTrimmed.length, MIN_KARAKTER_CAPAIAN, MAX_KARAKTER_CAPAIAN, capaianTrimmed)
          : `Capaian akhir minimal ${MIN_KARAKTER_CAPAIAN} karakter. Jelaskan hasil yang diperoleh agar catatan lebih informatif.`
            + charCountCardHtml(capaianTrimmed.length, MIN_KARAKTER_CAPAIAN, MAX_KARAKTER_CAPAIAN, capaianTrimmed),
        confirmButtonText: "Perbaiki Catatan",
      });
      focusLogbookField(capaianRef);
      return;
    }
    // Entri yang sedang direvisi (jika ada), untuk memakai ulang foto lama
    // saat mahasiswa tidak mengganti salah satu/kedua foto.
    const revisingEntry = editingLogbookId
      ? ([...logbooks, ...groupLogbooks].find((item) => item.id === editingLogbookId))
      : undefined;
    if (!editingLogbookId && (!logbookPhotoFile || !logbookPhoto2File)) {
      await Swal.fire({
        ...logbookSwalBase,
        icon: "warning",
        title: "Foto Belum Lengkap",
        text: "Unggah dua foto dokumentasi kegiatan terlebih dahulu agar bukti kegiatan tercatat dengan jelas.",
        confirmButtonText: "Perbaiki Catatan",
      });
      return;
    }
    if (editingLogbookId && !logbookPhotoFile && !logbookPhoto2File && !newEntry.foto && !revisingEntry?.foto) {
      await Swal.fire({
        ...logbookSwalBase,
        icon: "warning",
        title: "Foto Belum Lengkap",
        text: "Unggah dua foto dokumentasi kegiatan terlebih dahulu agar bukti kegiatan tercatat dengan jelas.",
        confirmButtonText: "Perbaiki Catatan",
      });
      return;
    }
    const fotoKekecilan = [logbookPhotoFile, logbookPhoto2File].some(
      (file) => file && file.size < 800 * 1024
    );
    if (fotoKekecilan) {
      await Swal.fire({
        ...logbookSwalBase,
        icon: "warning",
        title: "Ukuran Foto Kurang",
        text: "Setiap foto dokumentasi minimal berukuran 800 KB. Data belum disimpan. Silakan ganti dengan foto beresolusi lebih baik lalu coba simpan kembali.",
        confirmButtonText: "Perbaiki Catatan",
      });
      return;
    }

    setIsSubmittingLogbook(true);
    let uploadedFotoUrl = newEntry.foto || revisingEntry?.foto || "";
    // Revisi tanpa ganti foto: pakai URL foto yang sudah tersimpan.
    let uploadedFoto2Url = revisingEntry?.foto2 || "";

    try {
      const uploadPhoto = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("purpose", "logbook_photo");
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success || !uploadData.fileUrl) throw new Error(uploadData.error || "Gagal mengunggah foto logbook.");
        return String(uploadData.fileUrl);
      };
      if (logbookPhotoFile) uploadedFotoUrl = await uploadPhoto(logbookPhotoFile);
      if (logbookPhoto2File) uploadedFoto2Url = await uploadPhoto(logbookPhoto2File);
    } catch (err) {
      await Swal.fire({
        ...logbookSwalBase,
        icon: "error",
        title: "Gagal Mengunggah Foto",
        text: getErrorMessage(err, "Gagal mengunggah foto logbook. Silakan coba lagi beberapa saat kemudian."),
        confirmButtonText: "Coba Lagi",
      });
      setIsSubmittingLogbook(false);
      return;
    }

    const currentNpm = profile?.npm || "210610015";

    try {
      if (editingLogbookId) {
        // We are updating/revising an existing entry
        const res = await fetch("/api/mahasiswa/logbook", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingLogbookId,
            tanggal: newEntry.tanggal,
            judul: newEntry.judul,
            lokasi: newEntry.lokasi,
            deskripsi: newEntry.deskripsi,
            foto: uploadedFotoUrl,
            foto2: uploadedFoto2Url,
            capaianAkhir: newEntry.capaianAkhir,
            kategori: newEntry.kategori,
          }),
        });

        const data = await res.json();

        if (data.success) {
          setLogbooks(prev =>
            prev.map(item =>
              item.id === editingLogbookId
                ? {
                    ...item,
                    tanggal: newEntry.tanggal,
                    judul: newEntry.judul,
                    lokasi: newEntry.lokasi,
                    deskripsi: newEntry.deskripsi,
                    foto: uploadedFotoUrl,
                    foto2: uploadedFoto2Url,
                    capaianAkhir: newEntry.capaianAkhir,
                    kategori: newEntry.kategori,
                    status: "Dalam Tinjauan",
                    catatanDpl: "",
                  }
                : item
            )
          );
          await Swal.fire({
            ...logbookSwalBase,
            icon: "success",
            title: "Revisi Berhasil Disimpan",
            html: `Catatan logbook berhasil diperbarui dan dikirim ulang untuk verifikasi DPL.`
              + `<div class="lb-swal-checks"><div class="lb-swal-check"><i>&#10003;</i><span>Data revisi berhasil disimpan</span></div><div class="lb-swal-check"><i>&#10003;</i><span>Menunggu verifikasi DPL</span></div></div>`,
            confirmButtonText: "Lihat Logbook",
          });
        } else {
          throw new Error(data.error || "Gagal memperbarui logbook.");
        }
      } else {
        // Original add logic
        const res = await fetch("/api/mahasiswa/logbook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            npm: currentNpm,
            tanggal: newEntry.tanggal,
            judul: newEntry.judul,
            lokasi: newEntry.lokasi,
            deskripsi: newEntry.deskripsi,
            foto: uploadedFotoUrl,
            foto2: uploadedFoto2Url,
            capaianAkhir: newEntry.capaianAkhir,
            kategori: newEntry.kategori,
            minggu: selectedLogbookWeek,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success && data.logbook) {
          setLogbooks([data.logbook, ...logbooks]);
          // SweetAlert sukses HANYA muncul setelah backend mengonfirmasi data tersimpan.
          await Swal.fire({
            ...logbookSwalBase,
            icon: "success",
            title: "Logbook Berhasil Disimpan!",
            html: `Catatan logbook harian Anda telah berhasil disimpan ke dalam sistem.<br/><br/>Data kegiatan dan dokumentasi Anda telah berhasil tersimpan.`
              + `<div class="lb-swal-checks"><div class="lb-swal-check"><i>&#10003;</i><span>Data berhasil disimpan</span></div><div class="lb-swal-check"><i>&#10003;</i><span>Catatan logbook telah tercatat</span></div></div>`,
            confirmButtonText: "Lihat Logbook",
          });
        } else {
          throw new Error(data.error || "Gagal menyimpan logbook.");
        }
      }
    } catch (err) {
      console.error("Logbook submission/update error", err);
      const backendMessage = getErrorMessage(err, "Gagal menyimpan logbook.");
      // Jika backend menolak karena panjang isian (mis. "Deskripsi harus
      // 10–5000 karakter."), tampilkan SweetAlert validasi premium yang sama
      // — jangan pernah biarkan pesan mentah muncul sebagai alert browser.
      const lengthMatch = backendMessage.match(/(.+?) harus (\d+)[–-](\d+) karakter/);
      if (lengthMatch) {
        const field = lengthMatch[1].trim();
        const min = Number(lengthMatch[2]);
        const max = Number(lengthMatch[3]);
        const currentLen =
          field === "Judul" ? judulTrimmed.length
          : field === "Capaian akhir" ? capaianTrimmed.length
          : deskripsiTrimmed.length;
        const currentText =
          field === "Judul" ? judulTrimmed
          : field === "Capaian akhir" ? capaianTrimmed
          : deskripsiTrimmed;
        const isOver = currentLen > max;
        const isDeskripsi = field !== "Judul" && field !== "Capaian akhir";
        await Swal.fire({
          ...logbookSwalBase,
          icon: "warning",
          title: isOver ? "Catatan Terlalu Panjang" : "Catatan Masih Terlalu Singkat",
          html: isOver
            ? `Catatan logbook yang Anda masukkan melebihi batas maksimal ${max} karakter. Silakan ringkas atau perbaiki catatan Anda sebelum melanjutkan proses penyimpanan.`
              + charCountCardHtml(currentLen, min, max, currentText)
            : `Catatan yang Anda masukkan belum memenuhi jumlah karakter minimum yang diperlukan.`
              + charCountCardHtml(currentLen, min, max, currentText),
          confirmButtonText: isOver || !isDeskripsi ? "Perbaiki Catatan" : "Tambahkan Catatan",
        });
        // Tetap di form tanpa mengubah data, lalu fokus ke field terkait.
        if (field === "Judul") focusLogbookField(judulRef);
        else if (field === "Capaian akhir") focusLogbookField(capaianRef);
        else focusLogbookField(deskripsiRef);
      } else {
        await Swal.fire({
          ...logbookSwalBase,
          icon: "error",
          title: "Gagal Menyimpan Logbook",
          html: `Catatan logbook belum berhasil disimpan. Silakan periksa kembali data Anda dan coba lagi.<span class="lb-swal-detail">Detail: ${escapeSwalHtml(backendMessage)}</span>`,
          confirmButtonText: "Coba Lagi",
        });
      }
      // GAGAL: jangan reset form dan jangan tutup form, supaya data
      // tetap di halaman isi logbook dan bisa diperbaiki lalu disimpan ulang.
      setIsSubmittingLogbook(false);
      return;
    }

    // SUKSES (setelah tombol "Lihat Logbook" pada SweetAlert ditekan):
    // reset form lalu tutup form isi logbook sehingga mahasiswa
    // kembali ke halaman Daftar Logbook.
    setActiveTab("logbook");
    setIsSubmittingLogbook(false);
    setNewEntry({
      tanggal: new Date().toISOString().split("T")[0],
      judul: "",
      lokasi: "Meunasah Gampong",
      deskripsi: "",
      capaianAkhir: "",
      foto: "",
      kategori: "Mandiri",
    });
    setLogbookPhotoFile(null);
    setLogbookPhotoPreview("");
    setLogbookPhoto2File(null);
    setLogbookPhoto2Preview("");
    setEditingLogbookId(null);
    setIsModalOpen(false);
  };

  // Submit Laporan Revision to Backend API
  const handleUploadLaporanRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisingLaporan || !revisingLaporanFile) {
      alert("Mohon pilih file berkas laporan terlebih dahulu.");
      return;
    }

    setIsSubmittingLaporanRevision(true);

    try {
      // 1. Upload File to /api/upload
      const formData = new FormData();
      formData.append("file", revisingLaporanFile);
      formData.append("purpose", "report_document");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success) {
        alert("Gagal unggah berkas: " + (uploadData.error || "Format tidak valid"));
        setIsSubmittingLaporanRevision(false);
        return;
      }

      // 2. Update Laporan Record via PUT to /api/mahasiswa/laporan
      const res = await fetch("/api/mahasiswa/laporan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: revisingLaporan.id,
          jenis: revisingLaporan.jenis,
          namaFile: uploadData.fileName,
          fileUrl: uploadData.fileUrl,
          fileType: uploadData.fileType,
          fileSize: uploadData.fileSize,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const tanggalUpload = new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        setLaporans(prev =>
          prev.map(item =>
            item.id === revisingLaporan.id
              ? {
                  ...item,
                  namaFile: uploadData.fileName,
                  fileUrl: uploadData.fileUrl,
                  fileType: uploadData.fileType,
                  fileSize: uploadData.fileSize,
                  tanggalUpload,
                  status: "Dalam Tinjauan",
                  catatanDpl: "",
                }
              : item
          )
        );
        alert("Berkas laporan hasil revisi (" + uploadData.fileName + ") berhasil diunggah dan diajukan!");
        setRevisingLaporan(null);
        setRevisingLaporanFile(null);
      } else {
        alert("Gagal memperbarui laporan revisi: " + (data.error || ""));
      }
    } catch (err) {
      console.error("Laporan revision upload error", err);
      alert("Terjadi kesalahan server saat mengunggah revisi laporan.");
    }

    setIsSubmittingLaporanRevision(false);
  };


  // Submit Laporan Document (PDF & Word) to Backend API
  const handleUploadLaporan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!laporanDocumentFile) {
      alert("Mohon pilih file berkas laporan (PDF atau Word) terlebih dahulu.");
      return;
    }

    setIsSubmittingLaporan(true);
    const currentNpm = profile?.npm || "210610015";

    try {
      // 1. Upload File to /api/upload
      const formData = new FormData();
      formData.append("file", laporanDocumentFile);
      formData.append("purpose", "report_document");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success) {
        alert("Gagal unggah berkas: " + (uploadData.error || "Format tidak valid"));
        setIsSubmittingLaporan(false);
        return;
      }

      // 2. Save Laporan Record to /api/mahasiswa/laporan
      const res = await fetch("/api/mahasiswa/laporan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npm: currentNpm,
          jenis: newLaporan.jenis,
          namaFile: uploadData.fileName,
          fileUrl: uploadData.fileUrl,
          fileType: uploadData.fileType,
          fileSize: uploadData.fileSize,
        }),
      });

      const data = await res.json();

      if (data.success && data.laporan) {
        setLaporans([data.laporan, ...laporans]);
        alert("Berkas laporan (" + uploadData.fileName + ") berhasil diunggah ke database!");
      } else {
        const fallbackItem: LaporanBerkas = {
          id: Date.now(),
          jenis: newLaporan.jenis,
          namaFile: uploadData.fileName,
          fileUrl: uploadData.fileUrl,
          fileType: uploadData.fileType,
          fileSize: uploadData.fileSize,
          tanggalUpload: new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          status: "Dalam Tinjauan",
          catatanDpl: "Menunggu verifikasi DPL Pembimbing.",
        };
        setLaporans([fallbackItem, ...laporans]);
        alert("Berkas laporan berhasil diunggah!");
      }
    } catch (err) {
      console.error("Laporan upload error", err);
      alert("Terjadi kesalahan server saat mengunggah laporan.");
    }

    setIsSubmittingLaporan(false);
    setLaporanDocumentFile(null);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "1.2 MB";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  // Berkas upload handlers
  const handleBerkasFileChange = async (e: React.ChangeEvent<HTMLInputElement>, key: keyof typeof berkasUrls) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (key === "pasFoto" && file.size > 800 * 1024) {
      alert("Ukuran Pas Foto maksimal 800 KB.");
      e.target.value = "";
      return;
    }
    setBerkasUploading((prev) => ({ ...prev, [key]: true }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", key === "pasFoto" ? "requirement_photo" : "requirement_document");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal upload");
      setBerkasUrls((prev) => ({ ...prev, [key]: data.fileUrl }));
    } catch (err) {
      alert(getErrorMessage(err, "Gagal mengunggah berkas"));
    } finally {
      setBerkasUploading((prev) => ({ ...prev, [key]: false }));
      e.target.value = "";
    }
  };

  const handleSubmitBerkas = async () => {
    if (!profile?.npm) {
      alert("Profil tidak ditemukan");
      return;
    }
    const required: Array<keyof typeof berkasUrls> = ["slipPembayaran", "slipSpp", "transkrip", "krs", "pasFoto", "asuransiJiwa"];
    let perBerkasInside: Record<string, {status:'ok'|'x'}> | null = null;
    try { const j = JSON.parse(profile.catatanVerifikasiBerkas || ""); if (j && j.perBerkas) perBerkasInside = j.perBerkas; } catch {}
    const missing = required.filter((k) => {
      if ((perBerkasInside as any)?.[k]?.status === 'ok') return false;
      return !berkasUrls[k];
    });
    if (missing.length > 0) {
      alert(`Mohon lengkapi berkas: ${missing.join(", ")}`);
      return;
    }
    setIsSubmittingBerkas(true);
    try {
      const res = await fetch("/api/mahasiswa/berkas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npm: profile.npm,
          slipPembayaran: berkasUrls.slipPembayaran,
          slipSpp: berkasUrls.slipSpp,
          transkrip: berkasUrls.transkrip,
          krs: berkasUrls.krs,
          pasFoto: berkasUrls.pasFoto,
          asuransiJiwa: berkasUrls.asuransiJiwa,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal menyimpan berkas");
      await refreshProfile(true, true);
      alert("Berkas berhasil disimpan.");
    } catch (err) {
      alert(getErrorMessage(err, "Gagal menyimpan berkas"));
    } finally {
      setIsSubmittingBerkas(false);
    }
  };

  const isDocumentsRejected = isDocumentSubmissionRejected(profile?.status);
  // Verifikasi level mahasiswa dihapus: seluruh tab/fitur aktif untuk semua
  // mahasiswa. Upload berkas hanya dikontrol toggle global admin.
  // Verifikasi yang berlaku hanya verifikasi per-berkas oleh admin.
  const perBerkasStatus = parseDocumentReviews(profile?.catatanVerifikasiBerkas);
  const areAllDocumentsVerified = checkAllDocumentsVerified(perBerkasStatus);
  const selectFeatureTab = (tab: MahasiswaTab) => {
    if (tab !== "dashboard" && !areAllDocumentsVerified) return;
    setActiveTab(tab);
  };
  useEffect(() => {
    if (areAllDocumentsVerified || activeTab === "dashboard") return;
    const redirectTimer = setTimeout(() => setActiveTab("dashboard"), 0);
    return () => clearTimeout(redirectTimer);
  }, [activeTab, areAllDocumentsVerified]);
  const repairList = getDocumentRepairList(perBerkasStatus);
  // Perbaikan sudah dikirim semua, tinggal menunggu admin memeriksa ulang.
  const hasPendingReview = hasPendingDocumentReview(perBerkasStatus);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A202C]">
      <MahasiswaSidebar
        activeTab={activeTab}
        setActiveTab={selectFeatureTab}
        stats={{ logbook: logbooks.length, laporan: laporans.length }}
        session={profile}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onLogout={handleLogout}
        isVerified={areAllDocumentsVerified}
      />

      <div className={`${isSidebarCollapsed ? "md:ml-20" : "md:ml-64"} min-w-0 transition-all duration-300`}>
        <main className="dashboard-page mx-auto max-w-7xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-8 lg:px-8">

          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsMobileOpen(true)}
                className="btn-secondary p-2 md:hidden cursor-pointer"
                aria-label="Buka menu navigasi"
              >
                <Menu className="w-4 h-4 text-[#0F5132]" />
              </button>

              <Link href="/" className="btn-secondary min-w-0 px-2.5 text-xs shadow-xs sm:px-4">
                <ArrowLeft className="w-4 h-4 text-[#0F5132]" />
                <span className="hidden sm:inline">Kembali ke Portal Utama</span>
                <span className="sm:hidden">Portal</span>
              </Link>

              <span className="badge-academic text-xs font-bold bg-[#E6F4EA] text-[#0F5132] border-[#B7E1CD] hidden lg:inline-flex">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0F5132]" />
                Status: Mahasiswa Peserta Aktif
              </span>
            </div>
          </div>

          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <>
              {/* Profile Header Card */}

        {/* Profile Header Card */}
        {profile && (
          <div className="academic-card space-y-5 rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-xs sm:space-y-6 sm:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-[#E2E8F0] pb-6">
              <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-50 border border-[#CBD5E1] flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative">
                  {profile.foto ? (
                    <Image
                      src={profile.foto}
                      alt="Foto Mahasiswa"
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-[#0F5132] font-extrabold text-2xl">{profile.nama.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="break-words text-lg font-extrabold leading-tight text-[#1A202C] sm:text-2xl">{profile.nama}</h1>
                    <span className="badge-academic text-xs">{profile.status}</span>
                  </div>
                  <div className="text-xs text-[#718096] flex items-center gap-3 flex-wrap font-medium">
                    <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5 text-[#0F5132]" /> NPM: {profile.npm}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5 text-[#0F5132]" /> {profile.fakultas}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-[#0F5132]" /> {profile.prodi}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 self-stretch sm:self-auto justify-between sm:justify-start">
                <Link
                  href="/profil"
                  className="btn-secondary text-xs cursor-pointer shadow-xs justify-center"
                >
                  <User className="w-4 h-4 text-[#0F5132]" />
                  <span>Biodata Tambahan</span>
                </Link>
                {isProfileEditEnabled && (
                  <Link
                    href="/pendaftaran"
                    className="btn-primary text-xs cursor-pointer shadow-xs justify-center"
                  >
                    <BookOpen className="w-4 h-4 text-white" />
                    <span>Edit Data Pendaftaran</span>
                  </Link>
                )}
                <ChangePasswordDialog endpoint="/api/mahasiswa/password" />
              </div>
            </div>

            {/* Kelas & KKM Summary Grid - ganti Skema KKM */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-[#E2E8F0]">
                <span className="text-[11px] text-[#718096] font-medium block">Kelas</span>
                <span className="text-xs font-bold text-[#0F5132] block truncate">{(profile as any).kelasKuliah || "-"}</span>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-[#E2E8F0]">
                <span className="text-[11px] text-[#718096] font-medium block">KKM</span>
                <span className="text-xs font-bold text-[#1A202C] block truncate">{(profile as any).kkmSemester || "-"}</span>
              </div>
              <div className={`p-3.5 rounded-lg border ${!profile.gampong || profile.gampong === "Belum Ditentukan" ? "bg-amber-50 border-amber-200" : "bg-[#F8F8FA] border-[#E2E8F0]"}`}>
                <span className="text-[11px] text-[#718096] font-medium block">Lokasi Gampong</span>
                <span className={`text-xs font-bold block truncate ${!profile.gampong || profile.gampong === "Belum Ditentukan" || profile.gampong === "-" ? "text-amber-700" : "text-[#1A202C]"}`}>{profile.gampong && profile.gampong !== "Belum Ditentukan" && profile.gampong !== "-" ? profile.gampong : "-"}</span>
              </div>
              <div className={`p-3.5 rounded-lg border ${!profile.dpl || profile.dpl === "Belum Ditentukan" ? "bg-amber-50 border-amber-200" : "bg-[#F8F9FA] border-[#E2E8F0]"}`}>
                <span className="text-[11px] text-[#718096] font-medium block">DPL Pembimbing</span>
                <span className={`text-xs font-bold block truncate ${!profile.dpl || profile.dpl === "Belum Ditentukan" || profile.dpl === "-" ? "text-amber-700" : "text-[#1A202C]"}`}>{profile.dpl && profile.dpl !== "Belum Ditentukan" && profile.dpl !== "-" ? profile.dpl : "-"}</span>
              </div>
              <div className={`p-3.5 rounded-lg border min-[380px]:col-span-2 lg:col-span-1 ${!profile.posko || profile.posko === "Belum Ditentukan" ? "bg-amber-50 border-amber-200" : "bg-[#F8F9FA] border-[#E2E8F0]"}`}>
                <span className="text-[11px] text-[#718096] font-medium block">Posko Pengabdian</span>
                <span className={`text-xs font-bold block truncate ${!profile.posko || profile.posko === "Belum Ditentukan" || profile.posko === "-" ? "text-amber-700" : "text-[#0F5132]"}`}>{profile.posko && profile.posko !== "Belum Ditentukan" && profile.posko !== "-" ? profile.posko : "-"}</span>
              </div>
              </div>
            </div>
          </div>
        )}

              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#718096] font-semibold">Total Logbook Harian</span>
                    <FileText className="w-5 h-5 text-[#0F5132]" />
                  </div>
                  <div className="text-3xl font-extrabold text-[#1A202C]">{logbooks.length} Catatan</div>
                  <p className="text-[11px] text-[#0F5132] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi DPL
                  </p>
                </div>

                <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#718096] font-semibold">Berkas Laporan Terunggah</span>
                    <FileCheck className="w-5 h-5 text-[#0F5132]" />
                  </div>
                  <div className="text-3xl font-extrabold text-[#1A202C]">{laporans.length} Dokumen</div>
                  <p className="text-[11px] text-[#D97706] font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Format PDF & Word (.docx)
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-extrabold text-sm text-[#1A202C] flex items-center gap-2">
                  Aksi Cepat
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {([
                    {
                      id: "logbook",
                      label: "Tulis Logbook Harian",
                      desc: `${logbooks.length} catatan aktivitas terdata`,
                      badge: logbooks.filter((b) => b.status === "Perlu Revisi").length,
                      icon: <FileText className="w-5 h-5 text-[#0F5132]" />,
                    },
                    {
                      id: "laporan",
                      label: "Unggah Berkas Laporan",
                      desc: `${laporans.length} dokumen laporan terunggah`,
                      badge: laporans.filter((l) => l.status === "Perlu Revisi").length,
                      icon: <Upload className="w-5 h-5 text-[#0F5132]" />,
                    },
                    {
                      id: "kartu",
                      label: "Kartu Peserta KKM",
                      desc: "Lihat dan cetak kartu peserta digital",
                      icon: <GraduationCap className="w-5 h-5 text-[#0F5132]" />,
                    },
                  ] as Array<{ id: MahasiswaTab; label: string; desc: string; badge?: number; icon: React.ReactNode }>).map((action) => (
                    <button
                      key={action.id}
                      onClick={() => selectFeatureTab(action.id)}
                      disabled={!areAllDocumentsVerified}
                      className={`academic-card p-4 rounded-xl bg-white border text-left transition-all ${areAllDocumentsVerified ? "border-[#CBD5E1] hover:border-[#0F5132] hover:shadow-md cursor-pointer" : "border-[#E2E8F0] opacity-55 cursor-not-allowed"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#E6F4EA] flex items-center justify-center shrink-0">
                          {action.icon}
                        </div>
                        {typeof action.badge === "number" && action.badge > 0 && (
                          <span className="badge-academic text-[10px] bg-[#FDF6E7] text-amber-700 border-amber-200 shrink-0">
                            {action.badge} perlu revisi
                          </span>
                        )}
                      </div>
                      <h4 className="mt-3 font-extrabold text-sm text-[#1A202C]">{action.label}</h4>
                      <p className="text-xs text-[#718096] mt-0.5 leading-relaxed">{areAllDocumentsVerified ? action.desc : "Terbuka setelah seluruh berkas diverifikasi"}</p>
                    </button>
                  ))}
                </div>
              </div>

              {areAllDocumentsVerified && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-800">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Seluruh Berkas Terverifikasi
                      </div>
                      <p className="text-xs leading-relaxed text-emerald-700">
                        Seluruh berkas telah dinyatakan sesuai oleh admin. Dokumen resmi KKM kini dapat diunduh.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 min-[420px]:flex-row sm:shrink-0">
                      <a
                        href="/api/mahasiswa/dokumen-verifikasi?format=pdf"
                        download
                        className="btn-primary justify-center px-4 py-2.5 text-xs"
                      >
                        <Download className="h-4 w-4" /> Unduh PDF
                      </a>
                      <a
                        href="/api/mahasiswa/dokumen-verifikasi?format=docx"
                        download
                        className="btn-secondary justify-center px-4 py-2.5 text-xs"
                      >
                        <FileSpreadsheet className="h-4 w-4 text-[#0F5132]" /> Unduh Word
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload berkas ditampilkan hanya saat dibuka oleh admin. */}
              {isBerkasUploadEnabled && (
                <div className="academic-card p-4 sm:p-6 rounded-xl bg-white border border-[#CBD5E1] space-y-4">
                  <div className="border-b border-[#E2E8F0] pb-3">
                    <h3 className="text-sm sm:text-base font-extrabold text-[#1A202C] flex items-center gap-2">
                      <Upload className="w-5 h-5 text-[#0F5132]" />
                      Upload Berkas Persyaratan KKM
                      {(isDocumentsRejected || repairList.length > 0) && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold">{repairList.length > 0 ? `Perlu Perbaikan • ${repairList.length} berkas` : hasPendingReview ? "Menunggu Pemeriksaan Ulang" : "Perlu Perbaikan"}</span>
                      )}
                    </h3>
                    <p className="text-xs text-[#718096] mt-1">
                      Lengkapi enam berkas persyaratan berikut. Status setiap berkas ditentukan dari verifikasi per-berkas oleh admin.
                    </p>
                  </div>

                  {repairList.length > 0 && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 sm:p-5">
                      <div className="flex items-start gap-2 text-sm font-extrabold text-amber-900">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        Ada {repairList.length} berkas yang perlu diperbaiki
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-amber-800">
                        Admin menandai berkas berikut salah. Segera perbaiki file yang ditandai kuning di bawah lalu tekan <strong>Simpan Berkas</strong>. Berkas yang sudah sesuai tidak perlu diubah.
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {repairList.map((item) => (
                          <li key={item.key} className="rounded-md border border-amber-200 bg-white px-2.5 py-2 text-xs text-amber-900">
                            <span className="font-bold">{item.label}</span>
                            {item.note && <span className="block text-[11px] text-amber-700">Catatan admin: {item.note}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {repairList.length === 0 && hasPendingReview && isDocumentsRejected && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 sm:p-5">
                      <div className="flex items-start gap-2 text-sm font-extrabold text-blue-900">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                        Perbaikan sudah dikirim
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-blue-800">
                        Berkas perbaikan Anda sudah tersimpan dan menunggu pemeriksaan ulang oleh admin. Pantau halaman ini secara berkala.
                      </p>
                    </div>
                  )}

                  {isDocumentsRejected && profile?.catatanVerifikasiBerkas && (() => {
                    try { const j = JSON.parse(profile.catatanVerifikasiBerkas); if (j && j.perBerkas) return null; } catch {}
                    return (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 sm:p-5">
                      <div className="flex items-start gap-2 text-sm font-extrabold text-red-800">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                        Komentar Admin
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-red-700">{profile.catatanVerifikasiBerkas}</p>
                    </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: "slipPembayaran", label: "Slip Pembayaran", desc: "Bukti pembayaran KKM", required: true },
                      { key: "slipSpp", label: "Slip SPP", desc: "Bukti pembayaran SPP terakhir", required: true },
                      { key: "transkrip", label: "Transkrip Nilai", desc: "Transkrip akademik terbaru", required: true },
                      { key: "krs", label: "KRS", desc: "Kartu Rencana Studi semester berjalan", required: true },
                      { key: "pasFoto", label: "Pas Photo 3x4", desc: "Latar merah, almamater, jilbab putih untuk perempuan berjilbab", required: true },
                      { key: "asuransiJiwa", label: "Asuransi Jiwa", desc: "Bukti asuransi jiwa / BPJS", required: true },
                    ].map((berkas) => {
                      const st = perBerkasStatus?.[berkas.key];
                      const isOk = st?.status === 'ok';
                      const isX = st?.status === 'x';
                      const isPending = st?.status === 'pending';
                      const isLocked = !canUploadBerkas || isOk || isPending || (!!perBerkasStatus && !isX);
                      return (
                      <div key={berkas.key} className={`border rounded-lg p-3.5 space-y-2.5 ${isOk ? "bg-emerald-50 border-emerald-300" : isX ? "bg-amber-50 border-amber-300" : "bg-[#F8F9FA] border-[#E2E8F0]"}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#1A202C]">{berkas.label} {berkas.required && <span className="text-red-500">*</span>}</span>
                            {isOk ? <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">✓ Sesuai</span> : isX ? <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">✗ Salah — perbaiki</span> : isPending ? <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold">Menunggu pemeriksaan</span> : berkasUrls[berkas.key as keyof typeof berkasUrls] ? <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">✓ Terunggah</span> : null}
                          </div>
                          <p className="text-[11px] text-[#718096] leading-relaxed">{berkas.desc}</p>
                          {isX && st?.note && <p className="text-[11px] text-amber-800 bg-white border border-amber-200 rounded px-2 py-1 mt-1">Catatan admin: {st.note}</p>}
                          {isOk && <p className="text-[10px] text-emerald-700 mt-1">Sudah diceklis admin — tidak perlu diperbaiki.</p>}
                          {berkas.key === "pasFoto" && (
                            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">Wajib latar merah &amp; jas almamater, jilbab putih bagi mahasiswi berjilbab. Maksimal 800 KB.</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <label className={`flex-1 py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border transition-colors ${isLocked ? "bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed" : berkasUploading[berkas.key] ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" : berkasUrls[berkas.key as keyof typeof berkasUrls] ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" : "bg-white text-[#0F5132] border-[#CBD5E1] hover:border-[#0F5132] hover:bg-[#E6F4EA]"}`}>
                            <Upload className="w-3.5 h-3.5" />
                            <span>{isOk ? "Sudah sesuai" : isPending ? "Sedang diperiksa" : !isBerkasUploadEnabled ? "Upload ditutup" : berkasUploading[berkas.key] ? "Mengunggah..." : berkasUrls[berkas.key as keyof typeof berkasUrls] ? "Ganti File" : "Pilih File"}</span>
                            <input type="file" accept={berkas.key === "pasFoto" ? "image/jpeg,image/png,image/webp" : "image/*,application/pdf"} className="hidden" disabled={!!berkasUploading[berkas.key] || isLocked} onChange={(e) => handleBerkasFileChange(e, berkas.key as any)} />
                          </label>
                          {berkasUrls[berkas.key as keyof typeof berkasUrls] && (
                            <a href={berkasUrls[berkas.key as keyof typeof berkasUrls]} target="_blank" rel="noreferrer" className="p-2 text-[#0F5132] hover:bg-white border border-[#CBD5E1] rounded-md">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    )})}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#E2E8F0]">
                    <p className="text-[11px] text-[#718096]">Pastikan semua berkas sudah terunggah sebelum menyimpan. Format: PDF/JPG/PNG, maks 10MB per file.</p>
                    <button
                      onClick={handleSubmitBerkas}
                      disabled={isSubmittingBerkas || !canUploadBerkas}
                      className="btn-primary text-xs py-2.5 px-6 w-full sm:w-auto justify-center disabled:opacity-50"
                    >
                      {isSubmittingBerkas ? <><Loader2 className="w-4 h-4 animate-spin" /> <span>Menyimpan...</span></> : <><FileCheck className="w-4 h-4" /> <span>Simpan Berkas</span></>}
                    </button>
                  </div>
                </div>
              )}

            </>
          )}

        {/* TAB CONTENT 2: LOGBOOK DIGITAL (REALTIME) */}
        {activeTab === "logbook" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-[#E2E8F0]">
              <div>
                <h3 className="font-extrabold text-base text-[#1A202C]">Catatan Logbook Pengabdian Harian</h3>
                <p className={`mt-1 text-xs font-semibold ${isLogbookUploadOpen ? "text-emerald-700" : "text-slate-500"}`}>
                  {isLogbookUploadOpen
                    ? `Upload logbook Minggu ${activeLogbookWeek} dibuka oleh admin.`
                    : activeLogbookWeek
                      ? `Upload logbook Minggu ${selectedLogbookWeek} ditutup. Admin membuka Minggu ${activeLogbookWeek}.`
                      : "Logbook sedang ditutup oleh admin."}
                </p>
                <p className="mt-1 text-[11px] text-[#718096] leading-relaxed">
                  Minggu lain tetap dapat dilihat, tetapi tidak dapat menerima upload sampai dibuka oleh admin.
                </p>
              </div>

              <button
                onClick={openLogbookModal}
                disabled={!isLogbookUploadOpen}
                title={isLogbookUploadOpen ? `Upload akan masuk ke Minggu ${selectedLogbookWeek}` : `Logbook sedang ditutup oleh admin`}
                className="btn-primary text-xs py-2.5 px-4 shadow-xs"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>{isLogbookUploadOpen ? `Tambah Logbook ${logbookSubTab === "kelompok" ? "Kelompok" : "Mandiri"} Minggu ${selectedLogbookWeek}` : "Logbook Ditutup"}</span>
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-extrabold text-[#2D3748]">Kelompok Logbook per Minggu</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[1, 2, 3].map((week) => {
                const isOpen = activeLogbookWeek === week;
                const isActive = activeLogbookWeek === week;
                const isSelected = selectedLogbookWeek === week;
                const mandiriCount = logbooks.filter((entry) => logbookWeek(entry) === week && (entry.kategori === "Mandiri" || !entry.kategori)).length;
                const kelompokCount = visibleKelompokLogbooks.filter((entry) => logbookWeek(entry) === week).length;
                return (
                  <button
                    key={week}
                    type="button"
                    onClick={() => setSelectedLogbookWeek(week)}
                    className={`rounded-lg border px-4 py-3 text-left text-xs transition ${isSelected ? "border-[#0F5132] bg-[#E6F4EA] text-[#0F5132]" : "border-[#E2E8F0] bg-white text-[#4A5568] hover:bg-[#F8F9FA]"}`}
                  >
                    <span className="block font-extrabold">Minggu {week}{isActive ? " • Aktif" : ""}</span>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${isOpen ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {isOpen ? "Dibuka" : "Ditutup"}
                    </span>
                    <span className="mt-2 block text-[11px] text-[#718096]">{mandiriCount} Mandiri • {kelompokCount} Kelompok</span>
                  </button>
                );
              })}
              </div>
            </div>

            {/* Sub-tab Selectors for Logbook Mandiri and Kelompok */}
            <div className="flex bg-[#E2E8F0] p-1.5 rounded-lg w-fit border border-[#CBD5E1] gap-1">
              <button
                type="button"
                onClick={() => setLogbookSubTab("mandiri")}
                className={`py-1.5 px-4 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  logbookSubTab === "mandiri"
                    ? "bg-[#0F5132] text-white shadow-xs"
                    : "text-[#4A5568] hover:text-[#1A202C]"
                }`}
              >
                Logbook Mandiri ({selectedMandiriLogbooks.length})
              </button>
              <button
                type="button"
                onClick={() => setLogbookSubTab("kelompok")}
                className={`py-1.5 px-4 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  logbookSubTab === "kelompok"
                    ? "bg-[#0F5132] text-white shadow-xs"
                    : "text-[#4A5568] hover:text-[#1A202C]"
                }`}
              >
                Logbook Kelompok ({selectedKelompokLogbooks.length})
              </button>
            </div>

            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-3 text-xs text-[#4A5568]">
              Menampilkan <strong className="text-[#1A202C]">Logbook {logbookSubTab === "kelompok" ? "Kelompok" : "Mandiri"} Minggu {selectedLogbookWeek}</strong>.
            </div>

            {(logbookSubTab === "kelompok" ? selectedKelompokLogbooks : selectedMandiriLogbooks).length === 0 ? (
              <div className="p-8 bg-white rounded-lg border border-[#E2E8F0] text-center space-y-2">
                <FileText className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                <p className="text-xs text-[#718096]">Belum ada catatan logbook {logbookSubTab} pada Minggu {selectedLogbookWeek}.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(logbookSubTab === "kelompok" ? selectedKelompokLogbooks : selectedMandiriLogbooks)
                  .map((b) => (
                    <div key={b.id} className="academic-card rounded-lg bg-white border border-[#CBD5E1] overflow-hidden flex flex-col justify-between">
                      <div className="p-5 space-y-3">
                        <div className="relative aspect-[16/9] rounded-md overflow-hidden bg-[#F1F5F9] border border-[#E2E8F0]">
                          {b.foto ? (
                            <Image src={b.foto} alt={b.judul} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[11px] text-[#A0AEC0] font-semibold">Tanpa Foto</div>
                          )}
                          <div className="absolute top-2 left-2 flex gap-1.5">
                            <span className="badge-academic text-[10px] bg-[#1A202C] text-white border-0 font-bold px-2 py-0.5">
                              Minggu {logbookWeek(b)}
                            </span>
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1.5">
                            <span className="badge-academic text-[10px] bg-[#0F5132] text-white border-0 font-bold px-2 py-0.5">
                              {b.kategori || "Mandiri"}
                            </span>
                            {b.penulis && (
                              <span className="badge-academic text-[10px] bg-[#FDF6E7] text-amber-700 border-amber-200 font-bold px-2 py-0.5">
                                Oleh: {b.penulis}
                              </span>
                            )}
                            <span className={`badge-academic text-[10px] shadow-xs border ${
                              b.status === "Perlu Revisi" 
                                ? "bg-amber-100 text-amber-800 border-amber-300 font-bold" 
                                : b.status === "Disetujui DPL" 
                                ? "bg-green-100 text-green-800 border-green-300 font-bold" 
                                : "bg-white/95 border-[#CBD5E1]"
                            }`}>
                              {b.status}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-[#718096]">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#0F5132]" /> {b.tanggal}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#0F5132]" /> {b.lokasi}</span>
                        </div>

                        <h4 className="font-extrabold text-base text-[#1A202C] leading-tight">{b.judul}</h4>
                        <p className="text-xs text-[#4A5568] leading-relaxed">{b.deskripsi}</p>
                        {b.capaianAkhir && (
                          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                            <strong>Capaian Akhir:</strong> {b.capaianAkhir}
                          </div>
                        )}

                        {b.catatanDpl && (
                          <div className={`text-[11px] font-medium px-2.5 py-1.5 rounded border mt-2 ${
                            b.status === "Perlu Revisi"
                              ? "bg-amber-50 border-amber-200 text-amber-800"
                              : "bg-[#E6F4EA] border-[#B7E1CD] text-[#0F5132]"
                          }`}>
                            <strong>Catatan DPL:</strong> {b.catatanDpl}
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-[#F8F9FA] border-t border-[#E2E8F0] flex items-center justify-between text-xs gap-2">
                        {b.status === "Perlu Revisi" ? (
                          <button
                            onClick={() => {
                              setEditingLogbookId(b.id);
                              setNewEntry({
                                tanggal: b.tanggal,
                                judul: b.judul,
                                lokasi: b.lokasi,
                                deskripsi: b.deskripsi,
                                capaianAkhir: b.capaianAkhir || "",
                                foto: b.foto,
                                kategori: b.kategori || "Mandiri",
                              });
                              setLogbookPhotoPreview(b.foto);
                              setLogbookPhoto2Preview(b.foto2 || "");
                              setLogbookPhotoFile(null);
                              setLogbookPhoto2File(null);
                              setIsModalOpen(true);
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded flex items-center gap-1 transition-colors cursor-pointer text-xs"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Unggah Revisi</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#0F5132] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan di Database
                          </span>
                        )}
                        <div className="flex items-center gap-3">
                          <a href={b.foto} target="_blank" rel="noreferrer" className="text-[#0F5132] font-bold hover:underline flex items-center gap-1">
                            <span>Foto 1</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          {b.foto2 && (
                            <a href={b.foto2} target="_blank" rel="noreferrer" className="text-[#0F5132] font-bold hover:underline flex items-center gap-1">
                              <span>Foto 2</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

          </div>
        )}

        {/* TAB CONTENT 3: BERKAS LAPORAN (PDF & WORD UPLOAD) - Responsive Mobile Optimized */}
        {activeTab === "laporan" && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* Upload Laporan Form Box */}
            <div className="academic-card p-4 sm:p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-4 shadow-xs">
              <div className="border-b border-[#E2E8F0] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-extrabold text-[#1A202C] flex items-center gap-2 leading-tight">
                    <Upload className="w-5 h-5 text-[#0F5132] shrink-0" />
                    <span>Unggah Berkas Laporan KKM (PDF & Word)</span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#718096] mt-1 leading-relaxed">
                    Mendukung berkas format <strong>PDF (.pdf)</strong> dan <strong>Microsoft Word (.doc, .docx)</strong> dengan batas file s/d 25 MB.
                  </p>
                </div>
                <span className="badge-academic text-[10px] self-start sm:self-auto shrink-0">Verifikasi DPL</span>
              </div>

              <form onSubmit={handleUploadLaporan} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Jenis Laporan */}
                  <div className="min-w-0">
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1.5">
                      Jenis Dokumen Laporan *
                    </label>
                    <select
                      value={newLaporan.jenis}
                      onChange={(e) => setNewLaporan({ ...newLaporan, jenis: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs bg-white truncate"
                    >
                      {[
                        { value: "Laporan Mingguan Minggu 1", label: "Laporan Mingguan Minggu 1", kelompok: true },
                        { value: "Laporan Mingguan Minggu 2", label: "Laporan Mingguan Minggu 2", kelompok: true },
                        { value: "Laporan Mingguan Minggu 3", label: "Laporan Mingguan Minggu 3", kelompok: true },
                        { value: "Laporan Akhir KKM", label: "Laporan Akhir KKM (Lengkap)", kelompok: true },
                      ].map((opt) => {
                        const locked = opt.kelompok && profile?.isKetuaKelompok !== 1;
                        return (
                          <option key={opt.value} value={opt.value} disabled={locked}>
                            {opt.label}{locked ? " (Hanya Ketua Kelompok)" : ""}
                          </option>
                        );
                      })}
                    </select>
                    <p className="text-[10px] text-[#718096] mt-1.5 leading-relaxed">
                      Seluruh dokumen laporan adalah dokumen kelompok — hanya dapat diunggah oleh Ketua Kelompok gampong &amp; otomatis tampil untuk semua anggota.
                    </p>
                  </div>

                  {/* Document File Selector */}
                  <div className="min-w-0">
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1.5">
                      Pilih Berkas File (PDF / Word .doc/.docx) *
                    </label>
                    <input
                      type="file"
                      required
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => setLaporanDocumentFile(e.target.files?.[0] || null)}
                      className="w-full max-w-full min-w-0 text-[11px] sm:text-xs file:mr-2 sm:file:mr-3 file:py-2 file:px-3 sm:file:px-4 file:rounded-md file:border-0 file:text-[11px] sm:file:text-xs file:font-semibold file:bg-[#E6F4EA] file:text-[#0F5132] hover:file:bg-[#d5edd9] cursor-pointer file:shrink-0 truncate"
                    />
                    {laporanDocumentFile && (
                      <p className="text-[11px] text-[#0F5132] mt-1.5 font-medium truncate break-all">Terpilih: {laporanDocumentFile.name} ({formatFileSize(laporanDocumentFile.size)})</p>
                    )}
                  </div>

                </div>

                <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-0">
                  <button
                    type="submit"
                    disabled={isSubmittingLaporan}
                    className="btn-primary w-full sm:w-auto py-3 sm:py-2.5 px-6 text-[13px] sm:text-xs font-bold justify-center cursor-pointer shadow-xs"
                  >
                    {isSubmittingLaporan ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                        <span>Mengunggah Berkas ke Server...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-white shrink-0" />
                        <span>Unggah Berkas Laporan Ini</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* List Uploaded Reports - Responsive Mobile Cards */}
            <div className="academic-card p-4 sm:p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-4">
              <h4 className="text-sm font-bold text-[#1A202C] flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                <span className="leading-tight">Daftar Berkas Laporan Resmi Terdaftar</span>
                <span className="text-[11px] sm:text-xs text-[#718096] font-normal bg-[#F8F9FA] sm:bg-transparent border sm:border-0 border-[#E2E8F0] rounded-full sm:rounded-none px-2.5 py-1 sm:p-0 self-start sm:self-auto whitespace-nowrap">{visibleLaporans.length} File Terunggah</span>
              </h4>

              {visibleLaporans.length === 0 ? (
                <div className="p-6 sm:p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-[#A0AEC0]" />
                  </div>
                  <p className="text-xs sm:text-sm text-[#718096] font-medium">Belum ada berkas laporan yang diunggah.</p>
                  <p className="text-[11px] text-[#A0AEC0] mt-1">Unggah laporan pertama Anda pada form di atas.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E2E8F0] -mx-4 sm:mx-0">
                  {visibleLaporans.map((lap) => {
                    const isWord = lap.namaFile?.endsWith(".doc") || lap.namaFile?.endsWith(".docx") || lap.fileType?.includes("word");
                    return (
                      <div key={lap.id} className="py-4 px-4 sm:px-0 flex flex-col gap-3 sm:flex-row sm:items-start justify-between sm:gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className={`w-10 h-10 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${isWord ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                            {isWord ? <FileSpreadsheet className="w-5 h-5 shrink-0" /> : <FileText className="w-5 h-5 shrink-0" />}
                          </div>

                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <h5 className="font-extrabold text-[13px] sm:text-sm text-[#1A202C] leading-tight break-words">{lap.jenis}</h5>
                              {lap.penulis && (
                                <span className="badge-academic text-[10px] bg-[#FDF6E7] text-amber-700 border-amber-200 font-bold px-2 py-0.5 shrink-0 max-w-full truncate">
                                  Oleh: {lap.penulis}
                                </span>
                              )}
                              <span className={`badge-academic text-[10px] shrink-0 whitespace-nowrap ${
                                lap.status === "Perlu Revisi" 
                                  ? "bg-amber-100 text-amber-800 border-amber-300 font-bold" 
                                  : lap.status === "Disetujui DPL" 
                                  ? "bg-green-100 text-green-800 border-green-300 font-bold" 
                                  : "bg-[#E2E8F0] text-gray-800 border-[#CBD5E1]"
                              }`}>{lap.status}</span>
                            </div>
                            {/* Meta info: stack on mobile, inline on desktop */}
                            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-x-3 sm:gap-y-1 text-[11px] sm:text-xs text-[#718096] min-w-0">
                              <span className="inline-flex items-start sm:items-center gap-1 min-w-0 break-all leading-relaxed">
                                <span className="shrink-0">Nama File:</span> <strong className="text-[#2D3748] break-all min-w-0">{lap.namaFile}</strong>
                              </span>
                              <span className="hidden sm:inline text-[#CBD5E1]">•</span>
                              <span className="inline-flex items-center gap-1 shrink-0">
                                <span>Ukuran:</span> <span className="font-medium text-[#2D3748]">{formatFileSize(lap.fileSize)}</span>
                              </span>
                              <span className="hidden sm:inline text-[#CBD5E1]">•</span>
                              <span className="inline-flex items-center gap-1 shrink-0">
                                <span>Diunggah:</span> <span className="font-medium text-[#2D3748]">{lap.tanggalUpload}</span>
                              </span>
                            </div>
                            {lap.catatanDpl && (
                              <div className={`text-[11px] font-medium px-2.5 py-2 rounded border mt-2 leading-relaxed break-words ${
                                lap.status === "Perlu Revisi"
                                  ? "bg-amber-50 border-amber-200 text-amber-800"
                                  : "bg-[#E6F4EA] border-[#B7E1CD] text-[#0F5132]"
                              }`}>
                                <strong>Catatan DPL:</strong> {lap.catatanDpl}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto self-stretch sm:self-start sm:shrink-0 ml-[52px] sm:ml-0">
                          {lap.status === "Perlu Revisi" && !lap.penulis && (
                            <button
                              onClick={() => {
                                setRevisingLaporan(lap);
                                setRevisingLaporanFile(null);
                              }}
                              className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold py-2.5 sm:py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs sm:text-xs shadow-xs flex-1 sm:flex-none whitespace-nowrap"
                            >
                              <Upload className="w-3.5 h-3.5 shrink-0" />
                              <span>Unggah Revisi</span>
                            </button>
                          )}
                          <a
                            href={lap.fileUrl}
                            target="_blank"
                            download
                            rel="noreferrer"
                            className="btn-secondary text-xs py-2.5 sm:py-1.5 px-3 flex items-center justify-center gap-1.5 flex-1 sm:flex-none whitespace-nowrap border-[#CBD5E1] hover:border-[#0F5132]"
                          >
                            <Download className="w-3.5 h-3.5 text-[#0F5132] shrink-0" />
                            <span>Unduh File</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}

                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB CONTENT 4: KARTU PESERTA KKM */}
        {/* TAB CONTENT: ANGGOTA KELOMPOK */}
        {activeTab === "anggota" && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-[#1A202C] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#0F5132]" />
                  Anggota Kelompok {anggotaGampong ? `— ${anggotaGampong}` : ""}
                  {anggotaKkmSemester && (
                    <span className="badge-academic text-[10px] bg-[#E6F4EA] text-[#0F5132] border-[#B7E1CD] font-bold px-2 py-0.5">
                      KKM {anggotaKkmSemester}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-[#718096] mt-0.5">Daftar mahasiswa satu gampong dan satu semester KKM yang sama. Anda saling dapat melihat logbook kelompok & laporan gampong.</p>
              </div>
              {isKetuaSaya && (
                <span className="badge-academic text-[11px] bg-[#E6F4EA] text-[#0F5132] border-[#B7E1CD] font-bold px-3 py-1">
                  Anda Ketua Kelompok
                </span>
              )}
            </div>

            {!anggotaGampong ? (
              <div className="p-8 bg-white rounded-lg border border-[#E2E8F0] text-center space-y-2">
                <MapPin className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                <p className="text-xs text-[#718096]">Gampong Anda belum ditentukan. Daftar program terlebih dahulu atau hubungi admin LPPM.</p>
              </div>
            ) : anggotaList.length === 0 ? (
              <div className="p-8 bg-white rounded-lg border border-[#E2E8F0] text-center space-y-2">
                <Users className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                <p className="text-xs text-[#718096]">Belum ada anggota lain di gampong dan semester KKM ini.</p>
              </div>
            ) : (
              <>
                {isKetuaSaya && (
                  <div className="rounded-lg bg-[#E6F4EA] border border-[#B7E1CD] p-3 text-[11px] text-[#0F5132] font-medium flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    Sebagai Ketua Kelompok, unggahan Logbook Kelompok serta Laporan Mingguan 1–3 dan Laporan Akhir yang Anda kirim akan otomatis tampil untuk seluruh anggota di gampong ini.
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {anggotaList.map((a) => (
                    <div key={a.npm} className="academic-card p-4 rounded-lg bg-white border border-[#E2E8F0] space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-extrabold text-sm text-[#1A202C] leading-tight">{a.nama}</h4>
                        {a.isKetua && (
                          <span className="badge-academic text-[9px] bg-[#0F5132] text-white border-0 font-bold px-2 py-0.5 shrink-0">
                            KETUA
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-[#718096]">NPM: {a.npm}</div>
                      <div className="text-xs text-[#4A5568]">{a.prodi || "-"}</div>
                      <div className="text-[10px] text-[#A0AEC0]">{a.fakultas || "-"}</div>
                      {(a.kkmSemester || anggotaKkmSemester) && (
                        <div className="text-[10px] font-bold text-[#0F5132]">KKM {a.kkmSemester || anggotaKkmSemester}</div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "kartu" && profile && (
          <div className="academic-card p-6 sm:p-8 rounded-lg bg-white border border-[#CBD5E1] shadow-md max-w-2xl mx-auto space-y-6">
            <div className="border-b-2 border-[#0F5132] pb-4 text-center space-y-1">
              <div className="flex justify-center mb-2">
                <Image src="/images/logo.png" alt="Logo UMuslim" width={56} height={56} className="object-contain" />
              </div>
              <h2 className="font-extrabold text-lg text-[#1A202C]">UNIVERSITAS ALMUSLIM</h2>
              <div className="text-xs font-bold text-[#0F5132]">KARTU TANDA PESERTA KULIAH KERJA MASYARAKAT (KKM)</div>
              <div className="text-[11px] text-[#718096]">ANGKATAN XXXV TAHUN AKADEMIK 2026/2027</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 text-xs items-center">
              <div className="sm:col-span-3 aspect-[3/4] bg-[#F8F9FA] border border-[#CBD5E1] rounded-md flex items-center justify-center text-center p-2 text-[#718096] overflow-hidden relative">
                {profile.foto ? (
                  <Image
                    src={profile.foto}
                    alt="Foto Mahasiswa"
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  <div className="space-y-1">
                    <User className="w-10 h-10 text-[#0F5132] mx-auto" />
                    <div className="text-[10px] font-bold">FOTO 3x4 MAHASISWA</div>
                  </div>
                )}
              </div>

              <div className="sm:col-span-6 space-y-2 text-[#2D3748]">
                <div><span className="text-[#718096] inline-block w-24">Nama Lengkap</span>: <strong className="text-[#1A202C]">{profile.nama}</strong></div>
                <div><span className="text-[#718096] inline-block w-24">NPM</span>: <strong>{profile.npm}</strong></div>
                <div><span className="text-[#718096] inline-block w-24">Fakultas</span>: {profile.fakultas}</div>
                <div><span className="text-[#718096] inline-block w-24">Program Studi</span>: {profile.prodi}</div>
                <div><span className="text-[#718096] inline-block w-24">Skema KKM</span>: <strong className="text-[#0F5132]">{profile.program}</strong></div>
                <div><span className="text-[#718096] inline-block w-24">Lokasi Posko</span>: {profile.gampong}</div>
                <div><span className="text-[#718096] inline-block w-24">DPL</span>: {profile.dpl}</div>
              </div>

              <div className="sm:col-span-3 flex flex-col items-center justify-center space-y-1.5 border-t sm:border-t-0 sm:border-l border-dashed border-[#CBD5E1] pt-4 sm:pt-0 sm:pl-4">
                <div className="relative w-28 h-28 bg-white border border-[#CBD5E1] p-1 rounded-md flex items-center justify-center">
                  {verificationQr ? (
                    <Image src={verificationQr} alt="Verification QR Code" width={112} height={112} className="object-contain" unoptimized />
                  ) : (
                    <Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" />
                  )}
                </div>
                <div className="text-[9px] font-extrabold text-[#0F5132] uppercase tracking-wider text-center">
                  Scan Verifikasi Kartu
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
              <div className="text-[10px] text-[#718096]">Dicetak secara digital melalui SIKKMA Almuslim</div>
              <button
                onClick={() => handlePrintCard(profile)}
                className="btn-primary text-xs py-2 px-4 cursor-pointer"
              >
                <Download className="w-4 h-4 text-white" />
                <span>Cetak Kartu (PDF)</span>
              </button>
            </div>
          </div>
        )}
            {/* Modal Form Tambah / Edit Logbook */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] max-w-lg w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h3 className="text-base font-bold text-[#1A202C] flex items-center gap-2">
                  {editingLogbookId ? (
                    <Upload className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Plus className="w-4 h-4 text-[#0F5132]" />
                  )}
                  {editingLogbookId ? "Revisi Catatan Logbook Harian" : "Tambah Catatan Logbook Harian"}
                </h3>
                <button
                  onClick={closeLogbookModal}
                  className="text-[#718096] hover:text-[#1A202C] text-xs px-2 py-1 rounded bg-[#F1F5F9] cursor-pointer"
                >
                  ✕ Tutup
                </button>
              </div>

              {!editingLogbookId && (
                <div className={`rounded-lg border px-3 py-2.5 text-xs font-semibold ${isLogbookUploadOpen ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                  {isLogbookUploadOpen
                    ? `Logbook ini akan tersimpan ke Minggu ${selectedLogbookWeek} (tab minggu yang sedang Anda pilih).`
                    : "Logbook sedang ditutup admin — penyimpanan dinonaktifkan."}
                </div>
              )}

              <form onSubmit={handleAddLogbook} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                    Kategori Logbook *
                  </label>
                  <select
                    value={newEntry.kategori}
                    onChange={(e) => setNewEntry({ ...newEntry, kategori: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  >
                    <option value="Mandiri">Mandiri (Individu)</option>
                    <option value="Kelompok" disabled={profile?.isKetuaKelompok !== 1}>
                      Kelompok {profile?.isKetuaKelompok !== 1 ? "(Hanya untuk Ketua Kelompok)" : ""}
                    </option>
                  </select>
                  {profile?.isKetuaKelompok !== 1 && (
                    <p className="text-[10px] text-amber-600 mt-0.5 font-medium">
                      * Anda bukan Ketua Kelompok. Logbook Kelompok dinonaktifkan (DPL yang berwenang menunjuk Ketua Kelompok).
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                    Tanggal Kegiatan *
                  </label>
                  <input
                    type="date"
                    value={newEntry.tanggal}
                    onChange={(e) => setNewEntry({ ...newEntry, tanggal: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                    Judul / Nama Kegiatan *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Pendampingan UMKM Kemasan Gampong..."
                    value={newEntry.judul}
                    ref={judulRef}
                    onChange={(e) => setNewEntry({ ...newEntry, judul: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                  <div className="mt-1 text-[10px] leading-relaxed">
                    <span className="text-[#718096]">{newEntry.judul.trim().length} / {MAX_KARAKTER_JUDUL} karakter</span>
                    {newEntry.judul.trim().length > MAX_KARAKTER_JUDUL ? (
                      <span className="block font-semibold text-red-600">Melebihi batas maksimal {MAX_KARAKTER_JUDUL} karakter</span>
                    ) : newEntry.judul.trim().length >= MIN_KARAKTER_JUDUL ? (
                      <span className="block font-semibold text-emerald-700">✓ Jumlah karakter sudah memenuhi batas minimum</span>
                    ) : (
                      <span className="block font-semibold text-amber-600">Minimal {MIN_KARAKTER_JUDUL} karakter diperlukan</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                    Lokasi / Dusun Gampong *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Meunasah Gampong / Dusun Baro..."
                    value={newEntry.lokasi}
                    onChange={(e) => setNewEntry({ ...newEntry, lokasi: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                    Deskripsi & Hasil Kegiatan *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Jelaskan ringkasan jalannya kegiatan..."
                    value={newEntry.deskripsi}
                    ref={deskripsiRef}
                    onChange={(e) => setNewEntry({ ...newEntry, deskripsi: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                  <div className="mt-1 text-[10px] leading-relaxed">
                    <span className="text-[#718096]">{newEntry.deskripsi.trim().length} / {MAX_KARAKTER_DESKRIPSI} karakter</span>
                    {newEntry.deskripsi.trim().length > MAX_KARAKTER_DESKRIPSI ? (
                      <span className="block font-semibold text-red-600">Melebihi batas maksimal {MAX_KARAKTER_DESKRIPSI} karakter</span>
                    ) : newEntry.deskripsi.trim().length >= MIN_KARAKTER_DESKRIPSI ? (
                      <span className="block font-semibold text-emerald-700">✓ Jumlah karakter sudah memenuhi batas minimum</span>
                    ) : (
                      <span className="block font-semibold text-amber-600">Minimal {MIN_KARAKTER_DESKRIPSI} karakter diperlukan</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                    Capaian Akhir *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Jelaskan hasil akhir, manfaat, atau output yang berhasil dicapai..."
                    value={newEntry.capaianAkhir}
                    ref={capaianRef}
                    onChange={(e) => setNewEntry({ ...newEntry, capaianAkhir: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                  <div className="mt-1 text-[10px] leading-relaxed">
                    <span className="text-[#718096]">{newEntry.capaianAkhir.trim().length} / {MAX_KARAKTER_CAPAIAN} karakter</span>
                    {newEntry.capaianAkhir.trim().length > MAX_KARAKTER_CAPAIAN ? (
                      <span className="block font-semibold text-red-600">Melebihi batas maksimal {MAX_KARAKTER_CAPAIAN} karakter</span>
                    ) : newEntry.capaianAkhir.trim().length >= MIN_KARAKTER_CAPAIAN ? (
                      <span className="block font-semibold text-emerald-700">✓ Jumlah karakter sudah memenuhi batas minimum</span>
                    ) : (
                      <span className="block font-semibold text-amber-600">Minimal {MIN_KARAKTER_CAPAIAN} karakter diperlukan</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                    Foto Dokumentasi 1 {editingLogbookId ? "(kosongkan untuk memakai foto lama)" : "*"}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#E6F4EA] file:text-[#0F5132] cursor-pointer"
                  />
                  <p className="mt-1 text-[10px] text-[#718096]">Minimal 800 KB, maksimal 5 MB.</p>
                  {logbookPhotoPreview && (
                    <div className="mt-2 relative w-full aspect-[16/9] rounded-md overflow-hidden border border-[#CBD5E1]">
                      <Image src={logbookPhotoPreview} alt="Preview Foto Logbook" fill className="object-cover" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                    Foto Dokumentasi 2 {editingLogbookId ? "(kosongkan untuk memakai foto lama)" : "*"}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhoto2Select}
                    className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#E6F4EA] file:text-[#0F5132] cursor-pointer"
                  />
                  <p className="mt-1 text-[10px] text-[#718096]">Minimal 800 KB, maksimal 5 MB.</p>
                  {logbookPhoto2Preview && (
                    <div className="mt-2 relative w-full aspect-[16/9] rounded-md overflow-hidden border border-[#CBD5E1]">
                      <Image src={logbookPhoto2Preview} alt="Preview Foto Logbook kedua" fill className="object-cover" />
                    </div>
                  )}
                </div>
                </div>


                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={closeLogbookModal}
                    className="btn-secondary w-1/2 py-2.5 text-xs justify-center cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingLogbook}
                    className={`btn-primary w-1/2 py-2.5 text-xs justify-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed ${
                      editingLogbookId ? "bg-amber-600 hover:bg-amber-700 border-amber-600 hover:border-amber-700" : ""
                    }`}
                  >
                    {isSubmittingLogbook ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        {editingLogbookId ? (
                          <Upload className="w-4 h-4" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        <span>{editingLogbookId ? "Simpan Revisi Logbook" : "Simpan Logbook"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* Modal Form Revisi Laporan - Responsive */}
        {revisingLaporan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="academic-card p-4 sm:p-6 rounded-lg bg-white border border-[#CBD5E1] max-w-lg w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
                <h3 className="text-sm sm:text-base font-bold text-[#1A202C] flex items-center gap-2 min-w-0">
                  <Upload className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="truncate">Revisi Berkas Laporan KKM</span>
                </h3>
                <button
                  onClick={() => {
                    setRevisingLaporan(null);
                    setRevisingLaporanFile(null);
                  }}
                  className="text-[#718096] hover:text-[#1A202C] text-xs px-2.5 py-1.5 rounded bg-[#F1F5F9] cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-[#2D3748] break-words">
                  Jenis Laporan: <strong>{revisingLaporan.jenis}</strong>
                </div>
                <div className="text-xs text-[#2D3748] break-all">
                  Berkas Sebelumnya: <a href={revisingLaporan.fileUrl} target="_blank" rel="noreferrer" className="text-[#0F5132] underline break-all">{revisingLaporan.namaFile}</a>
                </div>
                {revisingLaporan.catatanDpl && (
                  <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded break-words leading-relaxed">
                    Catatan DPL: {revisingLaporan.catatanDpl}
                  </div>
                )}
              </div>

              <form onSubmit={handleUploadLaporanRevision} className="space-y-4">
                <div className="min-w-0">
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1.5">
                    Pilih Berkas File Revisi Baru (PDF / Word .doc/.docx) *
                  </label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => setRevisingLaporanFile(e.target.files?.[0] || null)}
                    className="w-full max-w-full min-w-0 text-[11px] sm:text-xs file:mr-2 sm:file:mr-3 file:py-2 file:px-3 sm:file:px-4 file:rounded-md file:border-0 file:text-[11px] sm:file:text-xs file:font-semibold file:bg-[#E6F4EA] file:text-[#0F5132] hover:file:bg-[#d5edd9] cursor-pointer file:shrink-0 truncate"
                  />
                  {revisingLaporanFile && (
                    <p className="text-[11px] text-[#0F5132] mt-1.5 font-medium truncate break-all">Terpilih: {revisingLaporanFile.name}</p>
                  )}
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRevisingLaporan(null);
                      setRevisingLaporanFile(null);
                    }}
                    className="btn-secondary w-1/2 py-2.5 text-xs justify-center cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingLaporanRevision}
                    className="btn-primary w-1/2 py-2.5 text-xs justify-center cursor-pointer bg-amber-600 hover:bg-amber-700 border-amber-600 hover:border-amber-700 font-bold"
                  >
                    {isSubmittingLaporanRevision ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-white" />
                        <span>Unggah Berkas Revisi</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

        </main>
      </div>
    </div>
  );
}

export default function MahasiswaPortal() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F9FA] text-[#1A202C] flex items-center justify-center">Memuat Portal Role Mahasiswa...</div>}>
      <StudentPortalContent />
    </Suspense>
  );
}
