"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Edit,
  Upload,
  ShieldCheck,
  Users,
  MapPin,
  LogOut,
  FileText,
  ArrowLeft,
  Search,
  CheckCircle2,
  Download,
  UserCheck,
  FileCheck,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  Newspaper,
  CalendarClock,
  MessageSquare,
  Menu,
  Clock,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Save,
  Check,
  X,
} from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import AdminBerkasPreview from "./AdminBerkasPreview";
import {
  isDocumentRejected,
  isDocumentVerified,
  needsRepair,
} from "../utils/student-status";
import { useVisibilityPolling } from "@/hooks/use-visibility-polling";

interface PengaduanRecord {
  id?: number;
  namaPengadu?: string;
  email?: string;
  telepon?: string;
  kategori?: string;
  judul?: string;
  pesan?: string;
  lampiran?: string;
  status?: string;
  tanggapan?: string;
  createdAt?: string;
}

type ExcelRow = Record<string, unknown>;
import type {
  AdminTab,
  AnnouncementRecord,
  BeritaRecord,
  DokumenRecord,
  DplRecord,
  GampongRecord,
  LaporanRecord,
  LogbookRecord,
  StrukturRecord,
  StudentProfileRecord,
  TimelineRecord,
} from "../types";

function AdminContent() {
  const router = useRouter();
  const [session, setSession] = useState<{ nama?: string; role?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLaporanGampongs, setExpandedLaporanGampongs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [studentStatusFilter, setStudentStatusFilter] = useState<"all" | "unverified" | "verified" | "changes">("all");
  const [studentKabupatenFilter, setStudentKabupatenFilter] = useState("");
  const [studentKecamatanFilter, setStudentKecamatanFilter] = useState("");
  const [studentGampongFilter, setStudentGampongFilter] = useState("");
  const [isBerkasUploadEnabled, setIsBerkasUploadEnabled] = useState(false);
  const [isUpdatingBerkasSetting, setIsUpdatingBerkasSetting] = useState(false);
  const [isProfileEditEnabled, setIsProfileEditEnabled] = useState(false);
  const [isUpdatingProfileSetting, setIsUpdatingProfileSetting] = useState(false);
  const [activeLogbookWeek, setActiveLogbookWeek] = useState<number | null>(null);
  const [isUpdatingLogbookWeek, setIsUpdatingLogbookWeek] = useState(false);

  // Real data state from Backend
  const [profiles, setProfiles] = useState<StudentProfileRecord[]>([]);
  const [logbooks, setLogbooks] = useState<LogbookRecord[]>([]);
  const [laporans, setLaporans] = useState<LaporanRecord[]>([]);
  const [gampongs, setGampongs] = useState<GampongRecord[]>([]);
  const [dpls, setDpls] = useState<DplRecord[]>([]);
  const [berita, setBerita] = useState<BeritaRecord[]>([]);
  const [dokumens, setDokumens] = useState<DokumenRecord[]>([]);
  const [timelines, setTimelines] = useState<TimelineRecord[]>([]);
  const [struktur, setStruktur] = useState<StrukturRecord[]>([]);
  const [pengaduans, setPengaduans] = useState<PengaduanRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [stats, setStats] = useState({
    totalPendaftar: 0,
    totalGampong: 0,
    totalDpl: 0,
    totalLogbook: 0,
    totalLaporan: 0,
    totalBerita: 0,
  });

  // Modal State: Form Tambah Gampong
  const [isGampongModalOpen, setIsGampongModalOpen] = useState(false);
  const [editingGampongId, setEditingGampongId] = useState<number | null>(null);
  const [newGampongForm, setNewGampongForm] = useState({
    nama: "",
    skema: "KKM Reguler",
    kabupaten: "Bireuen",
    kecamatan: "Peusangan",
    lokasi: "",
    angkatan: "",
    dpl: "",
    keuchik: "",
    kontakKeuchik: "",
    posko: "",
    kuota: 15,
  });
  const [isSubmittingGampong, setIsSubmittingGampong] = useState(false);
  const [isUploadingGampongExcel, setIsUploadingGampongExcel] = useState(false);

  // Modal State: Form Tambah Akun DPL
  const [isDplModalOpen, setIsDplModalOpen] = useState(false);
  const [editingDplId, setEditingDplId] = useState<number | null>(null);
  const [newDplForm, setNewDplForm] = useState({
    nama: "",
    nidn: "",
    password: "dpl123",
    fakultas: "Fakultas Ilmu Komputer (FIKOM)",
    skema: "KKM Reguler",
    kecamatan: "Peusangan",
  });
  const [isSubmittingDpl, setIsSubmittingDpl] = useState(false);

  // Student CRUD and Excel Import Modals
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  // Opsi A: per-berkas checklist ceklis/palang
  const [berkasPerBerkas, setBerkasPerBerkas] = useState<Record<string, Record<string, {status: 'ok' | 'x' | 'pending' | null, note: string}>>>({});
  const [newStudentForm, setNewStudentForm] = useState({
    nama: "",
    npm: "",
    password: "mahasiswa123",
    fakultas: "Fakultas Ilmu Komputer (FIKOM)",
    prodi: "Informatika",
    program: "KKM Reguler",
    kecamatan: "Peusangan",
    gampong: "",
    angkatan: "",
    lokasi: "",
    dpl: "",
    ipk: "3.50",
  });
  const [editStudentForm, setEditStudentForm] = useState({
    npm: "",
    nama: "",
    fakultas: "",
    prodi: "",
    program: "",
    kecamatan: "",
    gampong: "",
    angkatan: "",
    lokasi: "",
    dpl: "",
    ipk: "",
  });
  const [verificationDetails, setVerificationDetails] = useState<{
    profile: StudentProfileRecord | null;
    logbooks: LogbookRecord[];
    laporans: LaporanRecord[];
  }>({ profile: null, logbooks: [], laporans: [] });
  const [selectedApprovals, setSelectedApprovals] = useState<Set<string>>(new Set());
  const [expandedKkmStudentNpm, setExpandedKkmStudentNpm] = useState<string | null>(null);
  const [placementForms, setPlacementForms] = useState<Record<string, { gampong: string; dpl: string }>>({});
  const [savingPlacementNpm, setSavingPlacementNpm] = useState<string | null>(null);
  const [editingAngkatanNpm, setEditingAngkatanNpm] = useState<string | null>(null);
  const [angkatanInput, setAngkatanInput] = useState("");

  // Modal State: Form Tambah Berita
  const [isBeritaModalOpen, setIsBeritaModalOpen] = useState(false);
  const [newBeritaForm, setNewBeritaForm] = useState({
    judul: "",
    kategori: "Berita Kampus",
    tanggal: "",
    penulis: "Humas LPPM UMuslim",
    gambar: "",
    konten: "",
  });
  const [isSubmittingBerita, setIsSubmittingBerita] = useState(false);
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);

  const [newStrukturForm, setNewStrukturForm] = useState({
    label: "",
    value: "",
    urutan: 0,
  });
  const [isSubmittingStruktur, setIsSubmittingStruktur] = useState(false);

  // Modal State: Form Tambah Dokumen Unduhan
  const [isDokumenModalOpen, setIsDokumenModalOpen] = useState(false);
  const [newDokumenForm, setNewDokumenForm] = useState({
    judul: "",
    kategori: "Pedoman Resmi",
    deskripsi: "",
    fileUrl: "",
    format: "PDF",
    ukuran: 0,
    fileName: "",
  });
  const [isSubmittingDokumen, setIsSubmittingDokumen] = useState(false);
  const [isUploadingDokumen, setIsUploadingDokumen] = useState(false);

  // Modal State: Form Tambah Jadwal Timeline
  const [isJadwalModalOpen, setIsJadwalModalOpen] = useState(false);
  const [newJadwalForm, setNewJadwalForm] = useState({
    judul: "",
    tanggal: "",
    deskripsi: "",
    status: "Akan Datang",
  });
  const [isSubmittingJadwal, setIsSubmittingJadwal] = useState(false);

  // Modal State: Form Tambah/Edit Pengumuman Hero
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [newAnnouncementForm, setNewAnnouncementForm] = useState({
    label: "INFORMASI RESMI",
    message: "Pendaftaran KKM Universitas Almuslim Angkatan XXXV Tahun 2026 Resmi Dibuka.",
    deadline: "2026-07-25",
    isActive: true,
  });
  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);

  // (Buat Akun / Prapendaftaran dihapus - OTP via Telegram langsung, tanpa periode admin)

  // Upload Handler: Berita Photo (Max 1 MB)
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check maximum 1 MB limit (1 * 1024 * 1024 bytes)
    if (file.size > 1 * 1024 * 1024) {
      alert("Ukuran foto melebihi batas maksimal 1 MB. Silakan pilih berkas foto yang lebih kecil.");
      e.target.value = "";
      return;
    }

    setIsUploadingFoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "admin_media");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.fileUrl) {
        setNewBeritaForm((prev) => ({ ...prev, gambar: data.fileUrl }));
      } else {
        alert("Gagal mengunggah foto: " + (data.error || ""));
      }
    } catch (err) {
      console.error("Upload foto berita error", err);
      alert("Terjadi kesalahan saat mengunggah foto.");
    } finally {
      setIsUploadingFoto(false);
    }
  };

  // Upload Handler: Dokumen Unduhan (PDF/DOCX, Maks 10 MB)
  const handleDokumenFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Ukuran dokumen melebihi batas maksimal 10 MB.");
      e.target.value = "";
      return;
    }

    setIsUploadingDokumen(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "admin_document");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.fileUrl) {
        const format = (file.name.split(".").pop() || "PDF").toUpperCase();
        setNewDokumenForm((prev) => ({
          ...prev,
          fileUrl: data.fileUrl,
          format: format === "DOCX" ? "DOCX" : "PDF",
          ukuran: data.fileSize || file.size,
          fileName: data.fileName || file.name,
        }));
      } else {
        alert("Gagal mengunggah dokumen: " + (data.error || ""));
      }
    } catch (err) {
      console.error("Upload dokumen error", err);
      alert("Terjadi kesalahan saat mengunggah dokumen.");
    } finally {
      setIsUploadingDokumen(false);
    }
  };

  const loadAdminData = useCallback((silent = false) => {
    if (!silent) setIsLoading(true);
    return fetch("/api/admin/data")
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.push("/admin/login");
          return null;
        }
        return res.json();
      })
      .then((resData) => {
        if (!resData) return;
        if (resData.success && resData.data) {
          setProfiles(resData.data.profiles || []);
          setLogbooks(resData.data.logbooks || []);
          setLaporans(resData.data.laporans || []);
          setGampongs(resData.data.gampongs || []);
          setDpls(resData.data.dpls || []);
          setBerita(resData.data.berita || []);
          setDokumens(resData.data.dokumen || []);
          setTimelines(resData.data.timeline || []);
          setPengaduans(resData.data.pengaduans || []);
          setStruktur(resData.data.struktur || []);
          setAnnouncements(resData.data.announcements || []);
          setStats(
            resData.data.stats || {
              totalPendaftar: 0,
              totalGampong: 0,
              totalDpl: 0,
              totalLogbook: 0,
              totalLaporan: 0,
              totalBerita: 0,
            }
          );
        }
      })
      .catch((err) => {
        if (err?.name === "AbortError" || err?.name === "TimeoutError") return;
        console.error("Error fetching admin data", err);
      })
      .finally(() => {
        if (!silent) setIsLoading(false);
      });
  }, [router]);

  const handleToggleBerkasUpload = async () => {
    const next = !isBerkasUploadEnabled;
    setIsUpdatingBerkasSetting(true);
    try {
      const res = await fetch("/api/admin/berkas-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal memperbarui pengaturan upload.");
      setIsBerkasUploadEnabled(Boolean(data.enabled));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui pengaturan upload.");
    } finally {
      setIsUpdatingBerkasSetting(false);
    }
  };

  const handleToggleProfileEdit = async () => {
    const next = !isProfileEditEnabled;
    setIsUpdatingProfileSetting(true);
    try {
      const res = await fetch("/api/admin/profile-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal memperbarui pengaturan edit profil.");
      setIsProfileEditEnabled(Boolean(data.enabled));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui pengaturan edit profil.");
    } finally {
      setIsUpdatingProfileSetting(false);
    }
  };

  const handleSetActiveLogbookWeek = async (week: number | null) => {
    if (week === activeLogbookWeek) return;
    setIsUpdatingLogbookWeek(true);
    try {
      const res = await fetch("/api/admin/logbook-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeWeek: week }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal memperbarui minggu logbook.");
      setActiveLogbookWeek(data.activeWeek == null ? null : Number(data.activeWeek));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui minggu logbook.");
    } finally {
      setIsUpdatingLogbookWeek(false);
    }
  };

  const openStudentList = (filter: "all" | "unverified" | "verified" | "changes") => {
    setStudentStatusFilter(filter);
    setActiveTab("mahasiswaKKM");
  };

  useEffect(() => {
    fetch("/api/admin/berkas-settings")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data.success) setIsBerkasUploadEnabled(Boolean(data.enabled));
      })
      .catch((err) => console.error("Error fetching berkas upload setting", err));

    fetch("/api/admin/profile-settings")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data.success) setIsProfileEditEnabled(Boolean(data.enabled));
      })
      .catch((err) => console.error("Error fetching profile edit setting", err));

    fetch("/api/admin/logbook-settings")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data.success) setActiveLogbookWeek(data.activeWeek == null ? null : Number(data.activeWeek));
      })
      .catch((err) => console.error("Error fetching logbook week setting", err));

    fetch("/api/auth/session?role=admin")
      .then((res) => res.json())
      .then((resData) => {
        if (!resData.success || !resData.session) {
          router.push("/admin/login");
          return;
        }
        setSession(resData.session);

        // On mount, isLoading is already true, so we can fetch directly to avoid synchronous state update in effect
        fetch("/api/admin/data")
          .then((res) => {
            if (res.status === 401 || res.status === 403) {
              router.push("/admin/login");
              return null;
            }
            return res.json();
          })
          .then((adminData) => {
            if (!adminData) return;
            if (adminData.success && adminData.data) {
              setProfiles(adminData.data.profiles || []);
              setLogbooks(adminData.data.logbooks || []);
              setLaporans(adminData.data.laporans || []);
              setGampongs(adminData.data.gampongs || []);
              setDpls(adminData.data.dpls || []);
              setBerita(adminData.data.berita || []);
              setDokumens(adminData.data.dokumen || []);
              setTimelines(adminData.data.timeline || []);
              setPengaduans(adminData.data.pengaduans || []);
              setStruktur(adminData.data.struktur || []);
              setAnnouncements(adminData.data.announcements || []);
              setStats(
                adminData.data.stats || {
                  totalPendaftar: 0,
                  totalGampong: 0,
                  totalDpl: 0,
                  totalLogbook: 0,
                  totalLaporan: 0,
                  totalBerita: 0,
                }
              );
            }
          })
          .catch((err) => {
            console.error("Error fetching admin data", err);
          })
          .finally(() => {
            setIsLoading(false);
          });
      })
      .catch((err) => {
        console.error("Error fetching admin session", err);
        setIsLoading(false);
      });
  }, [router]);

  useVisibilityPolling(() => loadAdminData(true));

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error", err);
    }
    router.push("/admin/login");
  };

  // Submit Handler: Add Gampong / Posko
  const handleGampongExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingGampongExcel(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) throw new Error("File tidak dapat dibaca.");

        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws) as ExcelRow[];
        if (!rawData || rawData.length === 0) {
          alert("File Excel kosong atau tidak memiliki data yang valid.");
          return;
        }

        const get = (row: ExcelRow, keys: string[]) => {
          for (const k of keys) {
            const v = row[k];
            if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
          }
          return "";
        };

        const gampongsPayload: Record<string, unknown>[] = [];
        const dplsPayload: Record<string, unknown>[] = [];
        const seenDpls = new Set<string>();

        rawData.forEach((row: ExcelRow) => {
          const nama = get(row, ["Nama Gampong", "Nama Kampung", "Gampong", "Kampung", "Desa", "Nama"]);
          if (!nama) return;

          const kabupaten = get(row, ["Kabupaten", "Kab/Kota", "Kabupaten/Kota"]) || "Bireuen";
          const kecamatan = get(row, ["Kecamatan", "Daerah"]) || "Peusangan";
          const skema = get(row, ["Skema KKM", "Skema", "Program"]) || "KKM Reguler";
          const posko = get(row, ["Nama Posko", "Posko"]) || `Posko KKM ${nama}`;
          const dpl = get(row, ["DPL", "Dosen Pembimbing", "Dosen Pembimbing Lapangan"]);
          const nidn = get(row, ["NIDN", "Nidn"]);
          const keuchik = get(row, ["Keuchik", "Nama Keuchik"]) || "-";
          const kontakKeuchik = get(row, ["Kontak Keuchik", "No HP Keuchik", "Kontak"]) || "-";
          const kuota = Number(get(row, ["Kuota", "Jumlah Mahasiswa"])) || 15;

          gampongsPayload.push({
            nama,
            skema,
            kabupaten,
            kecamatan,
            dpl: dpl || "Belum Ditentukan",
            keuchik,
            kontakKeuchik,
            posko,
            kuota,
          });

          if (dpl) {
            const key = nidn || dpl;
            if (!seenDpls.has(key)) {
              seenDpls.add(key);
              dplsPayload.push({
                nama: dpl,
                nidn: nidn || `NIDN-${dpl.replace(/\s+/g, "")}`,
                password: "dpl123",
                fakultas: get(row, ["Fakultas"]) || "Fakultas Ilmu Komputer (FIKOM)",
                skema,
                kecamatan,
              });
            }
          }
        });

        if (gampongsPayload.length === 0) {
          alert("Tidak ditemukan data gampong yang valid pada file Excel.");
          return;
        }

        let dplCreated = 0;
        if (dplsPayload.length > 0) {
          const existingRes = await fetch("/api/dpl/list");
          const existingData = await existingRes.json();
          const existingNidns = new Set(((existingData.dpls ?? []) as DplRecord[]).map((d) => d.nidn));
          const newDpls = dplsPayload.filter((d) => !existingNidns.has(String(d.nidn)));
          if (newDpls.length > 0) {
            const dplRes = await fetch("/api/admin/dpl", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newDpls),
            });
            const dplData = await dplRes.json();
            if (dplData.success) dplCreated = dplData.dpls?.length || newDpls.length;
          }
        }

        const gampongRes = await fetch("/api/admin/gampong", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gampongsPayload),
        });
        const gampongData = await gampongRes.json();
        if (!gampongData.success) {
          throw new Error(gampongData.error || "Gagal menyimpan data gampong.");
        }

        setGampongs([...gampongData.gampongs, ...gampongs]);
        if (dplCreated > 0) {
          loadAdminData();
        }

        alert(
          `Berhasil import ${gampongData.gampongs.length} gampong/posko dan ${dplCreated} akun DPL dari Excel!`
        );
      } catch (err) {
        console.error("Excel upload gampong error", err);
        alert("Gagal membaca/menimpor file Excel. Pastikan format file valid (kolom Nama Gampong, Kecamatan, DPL, dll).");
      } finally {
        setIsUploadingGampongExcel(false);
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const openGampongForm = (gampong?: GampongRecord) => {
    setEditingGampongId(gampong?.id ?? null);
    setNewGampongForm(gampong
      ? {
          nama: gampong.nama,
          skema: gampong.skema,
          kabupaten: gampong.kabupaten || "Bireuen",
          kecamatan: gampong.kecamatan,
          lokasi: "",
          angkatan: "",
          dpl: gampong.dpl === "Belum Ditentukan" ? "" : gampong.dpl || "",
          keuchik: gampong.keuchik === "-" ? "" : gampong.keuchik || "",
          kontakKeuchik: gampong.kontakKeuchik === "-" ? "" : gampong.kontakKeuchik || "",
          posko: gampong.posko,
          kuota: gampong.kuota || 15,
        }
      : {
          nama: "", skema: "KKM Reguler", kabupaten: "Bireuen", kecamatan: "Peusangan", lokasi: "", angkatan: "",
          dpl: "", keuchik: "", kontakKeuchik: "", posko: "", kuota: 15,
        });
    setIsGampongModalOpen(true);
  };

  const handleSaveGampong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGampongForm.nama || !newGampongForm.posko) {
      alert("Mohon lengkapi Nama Gampong/Wilayah dan Nama Posko.");
      return;
    }

    setIsSubmittingGampong(true);
    try {
      const res = await fetch("/api/admin/gampong", {
        method: editingGampongId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingGampongId ? { ...newGampongForm, id: editingGampongId } : newGampongForm),
      });
      const data = await res.json();
      if (data.success && data.gampong) {
        setGampongs((current) => editingGampongId
          ? current.map((gampong) => gampong.id === editingGampongId ? data.gampong : gampong)
          : [data.gampong, ...current]);
        alert(editingGampongId ? `Gampong ${data.gampong.nama} berhasil diperbarui.` : `Berhasil menambah lokasi ${data.gampong.nama} (${data.gampong.skema})!`);
        setIsGampongModalOpen(false);
        setEditingGampongId(null);
      } else {
        alert(`Gagal ${editingGampongId ? "memperbarui" : "menambah"} gampong: ${data.error || ""}`);
      }
    } catch (err) {
      console.error("Add gampong error", err);
    }
    setIsSubmittingGampong(false);
  };

  // Delete Handler: Delete Gampong
  const handleDeleteGampong = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data gampong ini?")) return;
    try {
      const res = await fetch(`/api/admin/gampong?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setGampongs(gampongs.filter((g) => g.id !== id));
      }
    } catch (err) {
      console.error("Delete gampong error", err);
    }
  };

  // Submit Handler: Add DPL Account
  const openDplForm = (dpl?: DplRecord) => {
    setEditingDplId(dpl?.id ?? null);
    setNewDplForm(dpl
      ? {
          nama: dpl.nama,
          nidn: dpl.nidn,
          password: "",
          fakultas: dpl.fakultas || "Fakultas Ilmu Komputer (FIKOM)",
          skema: dpl.skema || "KKM Reguler",
          kecamatan: dpl.kecamatan || "Peusangan",
        }
      : {
          nama: "", nidn: "", password: "dpl123", fakultas: "Fakultas Ilmu Komputer (FIKOM)",
          skema: "KKM Reguler", kecamatan: "Peusangan",
        });
    setIsDplModalOpen(true);
  };

  const handleSaveDpl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDplForm.nama || !newDplForm.nidn || (!editingDplId && !newDplForm.password)) {
      alert("Mohon lengkapi Nama DPL, NIDN, dan Password.");
      return;
    }

    setIsSubmittingDpl(true);
    try {
      const res = await fetch("/api/admin/dpl", {
        method: editingDplId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingDplId ? { ...newDplForm, id: editingDplId } : newDplForm),
      });
      const data = await res.json();
      if (data.success && data.dpl) {
        setDpls((current) => editingDplId
          ? current.map((dpl) => dpl.id === editingDplId ? data.dpl : dpl)
          : [data.dpl, ...current]);
        alert(editingDplId ? `Akun DPL ${data.dpl.nama} berhasil diperbarui.` : `Berhasil membuat akun DPL untuk ${data.dpl.nama} (NIDN: ${data.dpl.nidn})!`);
        setIsDplModalOpen(false);
        setEditingDplId(null);
      } else {
        alert(`Gagal ${editingDplId ? "memperbarui" : "membuat"} akun DPL: ${data.error || ""}`);
      }
    } catch (err) {
      console.error("Add DPL error", err);
    }
    setIsSubmittingDpl(false);
  };

  // Individual Student Creation
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentForm.nama || !newStudentForm.npm) {
      alert("Nama dan NPM wajib diisi.");
      return;
    }
    setIsSubmittingStudent(true);
    try {
      const res = await fetch("/api/admin/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStudentForm),
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setProfiles([data.profile, ...profiles]);
        alert(`Sukses mendaftarkan mahasiswa ${data.profile.nama}!`);
        setIsStudentModalOpen(false);
        setNewStudentForm({
          nama: "",
          npm: "",
          password: "mahasiswa123",
          fakultas: "Fakultas Ilmu Komputer (FIKOM)",
          prodi: "Informatika",
          program: "KKM Reguler",
          kecamatan: "Peusangan",
          gampong: "",
          angkatan: "",
          lokasi: "",
          dpl: "",
          ipk: "3.50",
        });
      } else {
        alert("Gagal mendaftarkan mahasiswa: " + (data.error || ""));
      }
    } catch (err) {
      console.error("Add Student Error:", err);
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  // Student Edit
  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudentForm.npm) return;
    setIsSubmittingStudent(true);
    try {
      const res = await fetch("/api/admin/student", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editStudentForm),
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setProfiles(profiles.map(p => p.npm === editStudentForm.npm ? data.profile : p));
        alert("Profil mahasiswa berhasil diperbarui!");
        setIsEditStudentModalOpen(false);
      } else {
        alert("Gagal memperbarui profil: " + (data.error || ""));
      }
    } catch (err) {
      console.error("Edit Student Error:", err);
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  const openEditStudent = (profile: StudentProfileRecord) => {
    setEditStudentForm({
      npm: profile.npm,
      nama: profile.nama,
      fakultas: profile.fakultas,
      prodi: profile.prodi,
      program: profile.program,
      kecamatan: profile.kecamatan || "Peusangan",
      gampong: profile.gampong || "",
      angkatan: profile.angkatan || "",
      lokasi: profile.lokasi || "",
      dpl: profile.dpl || "",
      ipk: profile.ipk || "3.50",
    });
    setIsEditStudentModalOpen(true);
  };

  const handleEditAngkatan = (profile: StudentProfileRecord) => {
    setEditingAngkatanNpm(profile.npm);
    setAngkatanInput(profile.angkatan || "");
  };

  const handleCancelAngkatan = () => {
    setEditingAngkatanNpm(null);
    setAngkatanInput("");
  };

  const handleSaveAngkatan = async (npm: string) => {
    const angkatan = angkatanInput.trim();
    if (!angkatan) {
      alert("Angkatan tidak boleh kosong.");
      return;
    }
    if (!/^\d+$/.test(angkatan)) {
      alert("Angkatan harus berupa angka.");
      return;
    }
    try {
      const res = await fetch("/api/admin/student", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npm, angkatan }),
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setProfiles(profiles.map((p) => (p.npm === npm ? data.profile : p)));
        handleCancelAngkatan();
      } else {
        alert("Gagal memperbarui angkatan: " + (data.error || ""));
      }
    } catch (err) {
      console.error("Update Angkatan Error:", err);
      alert("Terjadi kesalahan saat menyimpan angkatan.");
    }
  };

  const handleAddAngkatan = () => {
    const newAngkatan = prompt("Masukkan nomor angkatan baru (contoh: 31):");
    if (!newAngkatan) return;
    if (!/^\d+$/.test(newAngkatan)) {
      alert("Angkatan harus berupa angka.");
      return;
    }
    // Find students without angkatan and assign the new one
    const studentsWithoutAngkatan = profiles.filter(p => !p.angkatan || p.angkatan.trim() === "");
    if (studentsWithoutAngkatan.length === 0) {
      alert("Semua mahasiswa sudah memiliki angkatan.");
      return;
    }
    if (!confirm(`Tetapkan angkatan ${newAngkatan} untuk ${studentsWithoutAngkatan.length} mahasiswa yang belum memiliki angkatan?`)) return;
    
    // Update dengan concurrency terbatas (maks 5 bersamaan) agar tidak membanjiri DB
    (async () => {
      const CONCURRENCY = 5;
      let successCount = 0;
      for (let i = 0; i < studentsWithoutAngkatan.length; i += CONCURRENCY) {
        const chunk = studentsWithoutAngkatan.slice(i, i + CONCURRENCY);
        const results = await Promise.all(chunk.map(p =>
          fetch("/api/admin/student", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ npm: p.npm, angkatan: newAngkatan }),
          })
        ));
        for (const res of results) {
          try {
            const data = await res.json();
            if (data.success) successCount++;
          } catch { /* ignore */ }
        }
      }
      if (successCount > 0) {
        loadAdminData();
        alert(`Berhasil menetapkan angkatan ${newAngkatan} untuk ${successCount} mahasiswa.`);
      } else {
        alert("Gagal menetapkan angkatan.");
      }
    })();
  };

  // Delete Student
  const handleDeleteStudent = async (npm: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus mahasiswa ini dari sistem?")) return;
    try {
      const res = await fetch(`/api/admin/student?npm=${npm}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setProfiles(profiles.filter(p => p.npm !== npm));
        alert("Mahasiswa berhasil dihapus.");
      } else {
        alert("Gagal menghapus mahasiswa: " + (data.error || ""));
      }
    } catch (err) {
      console.error("Delete Student Error:", err);
    }
  };

  const fetchVerificationDetails = async (npm: string) => {
    try {
      const res = await fetch(`/api/admin/student/files?npm=${encodeURIComponent(npm)}`);
      const data = await res.json();
      if (data.success) {
        setVerificationDetails({
          profile: data.profile,
          logbooks: data.logbooks || [],
          laporans: data.laporans || [],
        });
      } else {
        alert("Gagal memuat detail mahasiswa: " + (data.error || ""));
      }
    } catch (err) {
      console.error("Fetch verification details error:", err);
      alert("Terjadi kesalahan saat memuat detail mahasiswa.");
    }
  };

  const toggleSelectApproval = (npm: string) => {
    setSelectedApprovals((prev) => {
      const copy = new Set(prev);
      if (copy.has(npm)) copy.delete(npm);
      else copy.add(npm);
      return copy;
    });
  };

  const handleBulkApprove = async () => {
    if (selectedApprovals.size === 0) return alert("Pilih mahasiswa yang ingin disetujui.");
    if (!confirm(`Setujui ${selectedApprovals.size} mahasiswa terpilih?`)) return;
    try {
      for (const npm of Array.from(selectedApprovals)) {
        const res = await fetch("/api/admin/student/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ npm, action: "approve" }),
        });
        const data = await res.json();
        if (data.success && data.profile) {
          setProfiles((prev) => prev.map((p) => (p.npm === npm ? data.profile : p)));
        }
      }
      alert("Proses persetujuan selesai.");
      setSelectedApprovals(new Set());
    } catch (err) {
      console.error("Bulk approve error:", err);
      alert("Terjadi kesalahan saat menyetujui mahasiswa.");
    }
  };

  // Opsi A: helpers per-berkas ceklis/palang
  const parseBerkasJson = (profile: StudentProfileRecord) => {
    if (!profile.catatanVerifikasiBerkas) return null;
    try {
      const j = JSON.parse(profile.catatanVerifikasiBerkas);
      if (j && typeof j === 'object' && j.perBerkas) return j as {perBerkas: Record<string, {status:'ok'|'x'|'pending', note?:string}>, checkedAt?:string};
    } catch {}
    return null;
  };
  const getBerkasState = (npm: string, key: string, profile: StudentProfileRecord) => {
    const local = berkasPerBerkas[npm]?.[key];
    if (local && local.status) return local;
    const parsed = parseBerkasJson(profile);
    if (parsed?.perBerkas?.[key]) return {status: parsed.perBerkas[key].status, note: parsed.perBerkas[key].note || ""} as {status:'ok'|'x'|'pending'|null, note:string};
    return {status: null as 'ok'|'x'|'pending'|null, note: ""};
  };
  const setBerkasState = (npm: string, key: string, status: 'ok'|'x'|'pending'|null, note: string = "") => {
    setBerkasPerBerkas(prev => ({
      ...prev,
      [npm]: {
        ...prev[npm],
        [key]: {status, note}
      }
    }));
  };
  const handleSavePerBerkasVerification = async (profile: StudentProfileRecord) => {
    const keys = ['slipPembayaran','slipSpp','transkrip','krs','pasFoto','asuransiJiwa'] as const;
    const current = berkasPerBerkas[profile.npm] || {};
    const parsed = parseBerkasJson(profile);
    const perBerkas: Record<string, {status:'ok'|'x', note?:string}> = {};
    let hasX = false;
    for (const k of keys) {
      const local = current[k];
      const existing = parsed?.perBerkas?.[k];
      const entry = local?.status ? local : existing ? {status: existing.status, note: existing.note||""} : null;
      if (!entry || !entry.status || entry.status === "pending") {
        alert(`Berkas ${k} belum diperiksa. Pilih ikon ceklis atau palang terlebih dahulu.`);
        return;
      } else {
        perBerkas[k] = {status: entry.status, note: entry.note?.trim() || undefined} as any;
        if (entry.status === 'x') {
          if (!perBerkas[k].note) { alert(`Catatan untuk ${k} wajib diisi jika dipalang.`); return; }
          hasX = true;
        }
      }
    }
    const action = hasX ? 'reject_documents' as const : 'verify_documents' as const;
    const payload = JSON.stringify({perBerkas, checkedAt: new Date().toISOString()});
    try {
      const res = await fetch("/api/admin/student/verify", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({npm: profile.npm, action, catatanVerifikasiBerkas: payload})
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal");
      if (data.profile) setProfiles(prev => prev.map(p => p.npm === profile.npm ? data.profile : p));
      setBerkasPerBerkas(prev => {
        const next = {...prev};
        delete next[profile.npm];
        return next;
      });
      alert(hasX ? "Tersimpan: ada berkas tidak sesuai — mahasiswa hanya perlu perbaiki yang dipalang." : "Tersimpan: semua berkas sesuai — terverifikasi.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan per-berkas.");
    }
  };

  const toggleKkmStudentDetail = (profile: StudentProfileRecord) => {
    setExpandedKkmStudentNpm((current) => (current === profile.npm ? null : profile.npm));
    setPlacementForms((current) => current[profile.npm]
      ? current
      : {
          ...current,
          [profile.npm]: {
            gampong: profile.gampong === "Belum Ditentukan" ? "" : profile.gampong || "",
            dpl: profile.dpl === "Belum Ditentukan" ? "" : profile.dpl || "",
          },
        });
  };

  const handlePlacementChange = (npm: string, field: "gampong" | "dpl", value: string) => {
    setPlacementForms((current) => {
      const existing = current[npm] || { gampong: "", dpl: "" };
      if (field === "gampong") {
        const selectedGampong = gampongs.find((item) => item.nama === value);
        const configuredDpl = selectedGampong?.dpl;
        const canUseConfiguredDpl = configuredDpl && configuredDpl !== "Belum Ditentukan" && dpls.some((item) => item.nama === configuredDpl);
        return {
          ...current,
          [npm]: {
            gampong: value,
            dpl: canUseConfiguredDpl ? configuredDpl : existing.dpl,
          },
        };
      }
      return { ...current, [npm]: { ...existing, dpl: value } };
    });
  };

  const handleSaveStudentPlacement = async (profile: StudentProfileRecord) => {
    const placement = placementForms[profile.npm];
    if (!placement?.gampong || !placement.dpl) {
      alert("Pilih lokasi gampong dan DPL terlebih dahulu.");
      return;
    }

    setSavingPlacementNpm(profile.npm);
    try {
      const res = await fetch("/api/admin/student", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npm: profile.npm, ...placement }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal menyimpan penempatan mahasiswa.");
      if (data.profile) {
        setProfiles((current) => current.map((item) => item.npm === profile.npm ? data.profile : item));
        setPlacementForms((current) => ({
          ...current,
          [profile.npm]: { gampong: data.profile.gampong, dpl: data.profile.dpl },
        }));
      }
      alert("DPL dan lokasi gampong berhasil ditetapkan.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal menyimpan penempatan mahasiswa.");
    } finally {
      setSavingPlacementNpm(null);
    }
  };

  // Export biodata mahasiswa beserta tautan berkas dan nomor urut verifikasi.
  const handleExportExcel = async (
    profilesToExport: StudentProfileRecord[],
    filenamePrefix: string,
    emptyMessage: string,
    includeLocationInFilename = false,
  ) => {
    if (profilesToExport.length === 0) return alert(emptyMessage);
    setIsBackingUp(true);
    try {
      const verifiedSortedForExport = profiles.filter(pf => isDocumentVerified(pf.status)).sort((a,b) => {
        const aTime = (a as any).updatedAt ? new Date((a as any).updatedAt).getTime() : (a.id || 0);
        const bTime = (b as any).updatedAt ? new Date((b as any).updatedAt).getTime() : (b.id || 0);
        if (aTime !== bTime) return aTime - bTime;
        return (a.id || 0) - (b.id || 0);
      });
      const rows = profilesToExport.map((p, i) => {
        const isVerifiedExport = isDocumentVerified(p.status);
        const verifiedIdx = verifiedSortedForExport.findIndex(v => v.npm === p.npm) + 1;
        const nomorMahasiswa = isVerifiedExport ? `${p.angkatan || "XXX"}${String(verifiedIdx).padStart(3, "0")}` : "";
        return {
        No: i + 1,
        "Nomor Mahasiswa": nomorMahasiswa,
        "Nama Lengkap": p.nama,
        NPM: p.npm,
        "Tempat Lahir": (p as any).tempatLahir || "",
        "Tanggal Lahir": (p as any).tanggalLahir || "",
        IPK: p.ipk,
        Fakultas: p.fakultas,
        "Program Studi": p.prodi,
        "SKS Lulus": (p as any).sksLulus ?? "",
        "SKS Belum Lulus": (p as any).sksBelumLulus ?? "",
        "Kelas Kuliah": (p as any).kelasKuliah || "",
        "Status Perkawinan": (p as any).statusPerkawinan || "",
        "Alamat Sekarang": (p as any).alamatSekarang || (p as any).alamat || "",
        "Nomor Telepon": (p as any).noTelepon || (p as any).noHpMahasiswa || "",
        "HP Orang Tua/Wali": (p as any).hpOrtuWali || (p as any).noHpOrtu || "",
        Email: (p as any).email || "",
        "Semester KKM": (p as any).kkmSemester || "",
        "Program KKM": p.program,
        Kabupaten: normalizedKabupaten(p.kabupaten),
        Kecamatan: p.kecamatan,
        Gampong: p.gampong,
        DPL: p.dpl,
        Posko: p.posko,
        "Tanggal Daftar": p.tanggalDaftar,
        "Status Verifikasi": p.status,
        "Link Slip Pembayaran": (p as any).slipPembayaran || p.buktiPembayaran || "",
        "Link Slip SPP": (p as any).slipSpp || "",
        "Link Transkrip Nilai": p.transkrip || "",
        "Link KRS": p.krs || "",
        "Link Pas Foto": p.foto || "",
        "Link Asuransi Jiwa/BPJS": (p as any).asuransiJiwa || "",
        "Golongan Darah": (p as any).golonganDarah || "",
        "Riwayat Penyakit": (p as any).riwayatPenyakit || "",
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const headers = Object.keys(rows[0]);
      ws["!cols"] = headers.map((header) => ({
        wch: header.startsWith("Link ") ? 55 : Math.min(35, Math.max(12, header.length + 3)),
      }));
      headers.forEach((header, columnIndex) => {
        if (!header.startsWith("Link ")) return;
        rows.forEach((row, rowIndex) => {
          const link = String(row[header as keyof typeof row] || "");
          if (!link) return;
          const cell = ws[XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex })];
          if (cell) cell.l = { Target: link, Tooltip: "Buka berkas mahasiswa" };
        });
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pendaftaran Mahasiswa");
      const tanggal = new Date().toISOString().slice(0, 10);
      const lokasi = includeLocationInFilename
        ? [studentKabupatenFilter, studentKecamatanFilter, studentGampongFilter]
            .filter(Boolean)
            .join("_")
            .replace(/[^0-9A-Za-z_-]+/g, "-")
        : "";
      XLSX.writeFile(wb, `${filenamePrefix}${lokasi ? `_${lokasi}` : ""}_${tanggal}.xlsx`);
    } catch (err) {
      console.error("Export excel error", err);
      alert("Gagal membuat Export Excel.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleExportVerifiedStudents = () => {
    void handleExportExcel(
      profiles.filter((profile) => isDocumentVerified(profile.status)),
      "Export_Mahasiswa_Terverifikasi",
      "Tidak ada mahasiswa terverifikasi untuk diekspor.",
    );
  };

  const handleExportLocationFilteredStudents = () => {
    void handleExportExcel(
      filteredProfiles,
      "Export_Mahasiswa_Filter_Lokasi",
      "Tidak ada mahasiswa yang sesuai dengan filter kabupaten, kecamatan, atau gampong.",
      true,
    );
  };

  // Excel Importer for DPLs
  const handleImportDplsExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingExcel(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) throw new Error("File tidak dapat dibaca.");
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws) as ExcelRow[];

        const formatted = rawData.map((row: ExcelRow) => ({
          nama: String(row.Nama || row.nama || row["Nama DPL"] || row["Nama Lengkap"] || "").trim(),
          nidn: String(row.NIDN || row.nidn || row.Nidn || "").trim(),
          password: String(row.Password || row.password || "dpl123").trim() || "dpl123",
          fakultas: String(row.Fakultas || row.fakultas || "Fakultas Ilmu Komputer (FIKOM)").trim(),
          skema: String(row.Skema || row.skema || row["Skema KKM"] || "KKM Reguler").trim(),
          kecamatan: String(row.Kecamatan || row.kecamatan || "Peusangan").trim(),
        })).filter(item => item.nama && item.nidn);

        if (formatted.length === 0) {
          alert("Data tidak valid. Pastikan file Excel memiliki kolom 'Nama DPL' dan 'NIDN'.");
          setIsImportingExcel(false);
          return;
        }

        const res = await fetch("/api/admin/dpl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formatted),
        });

        const data: { success?: boolean; error?: string; dpls?: DplRecord[] } = await res.json();
        const importedDpls = data.success ? data.dpls : undefined;
        if (importedDpls && importedDpls.length > 0) {
          await loadAdminData(true);
          alert(`Sukses meng-import ${importedDpls.length} akun DPL dari Excel!`);
        } else {
          alert("Gagal meng-import DPL Excel: " + (data.error || ""));
        }
      } catch (err) {
        console.error("Excel DPL import error", err);
        alert("Gagal membaca file Excel DPL. Pastikan format file valid (.xlsx / .xls).");
      } finally {
        setIsImportingExcel(false);
        e.target.value = ""; // clear input
      }
    };
    reader.readAsBinaryString(file);
  };

  // Delete Handler: Delete DPL
  const handleDeleteDpl = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus akun DPL ini?")) return;
    try {
      const res = await fetch(`/api/admin/dpl?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setDpls(dpls.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error("Delete DPL error", err);
    }
  };

  // Submit Handler: Add Berita
  const handleAddBerita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBeritaForm.judul || !newBeritaForm.tanggal || !newBeritaForm.konten) {
      alert("Mohon lengkapi Judul Berita, Tanggal, dan Konten.");
      return;
    }
    if (!newBeritaForm.gambar) {
      alert("Mohon unggah foto berita terlebih dahulu (Maksimal 1 MB).");
      return;
    }

    setIsSubmittingBerita(true);
    try {
      const res = await fetch("/api/admin/berita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBeritaForm),
      });
      const data = await res.json();
      if (data.success && data.berita) {
        setBerita([data.berita, ...berita]);
        alert(`Berhasil mempublikasikan berita: ${data.berita.judul}!`);
        setIsBeritaModalOpen(false);
        setNewBeritaForm({
          judul: "",
          kategori: "Berita Kampus",
          tanggal: "",
          penulis: "Humas LPPM UMuslim",
          gambar: "",
          konten: "",
        });
      } else {
        alert("Gagal menambah berita: " + (data.error || ""));
      }
    } catch (err) {
      console.error("Add berita error", err);
    }
    setIsSubmittingBerita(false);
  };

  // Delete Handler: Delete Berita
  const handleDeleteBerita = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus berita ini?")) return;
    try {
      const res = await fetch(`/api/admin/berita?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setBerita(berita.filter((b) => b.id !== id));
      }
    } catch (err) {
      console.error("Delete berita error", err);
    }
  };

  // Submit Handler: Add Struktur LPPM
  const handleAddStruktur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStrukturForm.label || !newStrukturForm.value) {
      alert("Mohon lengkapi label dan nilai struktur.");
      return;
    }

    setIsSubmittingStruktur(true);
    try {
      const res = await fetch("/api/admin/struktur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStrukturForm),
      });
      const data = await res.json();
      if (data.success && data.struktur) {
        setStruktur((prev) => [data.struktur, ...prev]);
        alert(`Berhasil menambahkan item struktur: ${data.struktur.label}`);
        setNewStrukturForm({ label: "", value: "", urutan: 0 });
      } else {
        alert("Gagal menambah item struktur: " + (data.error || ""));
      }
    } catch (err) {
      console.error("Add struktur error", err);
    } finally {
      setIsSubmittingStruktur(false);
    }
  };

  // Delete Handler: Delete Struktur LPPM
  const handleDeleteStruktur = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus item struktur ini?")) return;
    try {
      const res = await fetch(`/api/admin/struktur?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setStruktur((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error("Delete struktur error", err);
    }
  };

  // Submit Handler: Add Dokumen Unduhan
  const handleAddDokumen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDokumenForm.judul || !newDokumenForm.kategori || !newDokumenForm.fileUrl) {
      alert("Mohon lengkapi Judul, Kategori, dan unggah berkas dokumen.");
      return;
    }

    setIsSubmittingDokumen(true);
    try {
      const res = await fetch("/api/admin/dokumen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judul: newDokumenForm.judul,
          kategori: newDokumenForm.kategori,
          deskripsi: newDokumenForm.deskripsi,
          fileUrl: newDokumenForm.fileUrl,
          format: newDokumenForm.format,
          ukuran: newDokumenForm.ukuran,
        }),
      });
      const data = await res.json();
      if (data.success && data.dokumen) {
        setDokumens([data.dokumen, ...dokumens]);
        alert(`Berhasil menambahkan dokumen: ${data.dokumen.judul}!`);
        setIsDokumenModalOpen(false);
        setNewDokumenForm({
          judul: "",
          kategori: "Pedoman Resmi",
          deskripsi: "",
          fileUrl: "",
          format: "PDF",
          ukuran: 0,
          fileName: "",
        });
      } else {
        alert("Gagal menambah dokumen: " + (data.error || ""));
      }
    } catch (err) {
      console.error("Add dokumen error", err);
    }
    setIsSubmittingDokumen(false);
  };

  // Delete Handler: Delete Dokumen Unduhan
  const handleDeleteDokumen = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus dokumen ini?")) return;
    try {
      const res = await fetch(`/api/admin/dokumen?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setDokumens(dokumens.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error("Delete dokumen error", err);
    }
  };

  // Submit Handler: Add Jadwal Timeline
  const handleAddJadwal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJadwalForm.judul || !newJadwalForm.tanggal) {
      alert("Mohon lengkapi Judul Tahapan dan Tanggal.");
      return;
    }

    setIsSubmittingJadwal(true);
    try {
      const res = await fetch("/api/admin/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judul: newJadwalForm.judul,
          tanggal: newJadwalForm.tanggal,
          deskripsi: newJadwalForm.deskripsi,
          status: newJadwalForm.status,
          urutan: timelines.length,
        }),
      });
      const data = await res.json();
      if (data.success && data.timeline) {
        setTimelines([...timelines, data.timeline]);
        alert(`Berhasil menambahkan tahapan: ${data.timeline.judul}!`);
        setIsJadwalModalOpen(false);
        setNewJadwalForm({
          judul: "",
          tanggal: "",
          deskripsi: "",
          status: "Akan Datang",
        });
      } else {
        alert("Gagal menambah tahapan: " + (data.error || ""));
      }
    } catch (err) {
      console.error("Add jadwal error", err);
    }
    setIsSubmittingJadwal(false);
  };

  // Delete Handler: Delete Jadwal Timeline
  const handleDeleteJadwal = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus tahapan ini?")) return;
    try {
      const res = await fetch(`/api/admin/timeline?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setTimelines(timelines.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error("Delete jadwal error", err);
    }
  };

  // Announcement Handlers
  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncementForm.label || !newAnnouncementForm.message) {
      alert("Mohon lengkapi Label dan Pesan.");
      return;
    }

    setIsSubmittingAnnouncement(true);
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAnnouncementForm),
      });
      const data = await res.json();
      if (data.success && data.announcement) {
        setAnnouncements([data.announcement, ...announcements]);
        alert(`Berhasil menambah pengumuman: ${data.announcement.label}!`);
        setIsAnnouncementModalOpen(false);
        setNewAnnouncementForm({
          label: "INFORMASI RESMI",
          message: "Pendaftaran KKM Universitas Almuslim Angkatan XXXV Tahun 2026 Resmi Dibuka.",
          deadline: "2026-07-25",
          isActive: true,
        });
        setEditingAnnouncement(null);
      } else {
        alert("Gagal menambah pengumuman: " + (data.error || ""));
      }
    } catch (err) {
      console.error("Add announcement error", err);
    }
    setIsSubmittingAnnouncement(false);
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement?.id) return;
    if (!newAnnouncementForm.label || !newAnnouncementForm.message) {
      alert("Mohon lengkapi Label dan Pesan.");
      return;
    }

    setIsSubmittingAnnouncement(true);
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingAnnouncement.id, ...newAnnouncementForm }),
      });
      const data = await res.json();
      if (data.success && data.announcement) {
        setAnnouncements((prev) => prev.map((a) => (a.id === editingAnnouncement.id ? data.announcement : a)));
        alert(`Berhasil memperbarui pengumuman: ${data.announcement.label}!`);
        setIsAnnouncementModalOpen(false);
        setNewAnnouncementForm({
          label: "INFORMASI RESMI",
          message: "Pendaftaran KKM Universitas Almuslim Angkatan XXXV Tahun 2026 Resmi Dibuka.",
          deadline: "2026-07-25",
          isActive: true,
        });
        setEditingAnnouncement(null);
      } else {
        alert("Gagal memperbarui pengumuman: " + (data.error || ""));
      }
    } catch (err) {
      console.error("Update announcement error", err);
    }
    setIsSubmittingAnnouncement(false);
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pengumuman ini?")) return;
    try {
      const res = await fetch(`/api/admin/announcement?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("Delete announcement error", err);
    }
  };

  const openEditAnnouncement = (announcement: AnnouncementRecord) => {
    setEditingAnnouncement(announcement);
    setNewAnnouncementForm({
      label: announcement.label,
      message: announcement.message,
      deadline: announcement.deadline || "",
      isActive: announcement.isActive,
    });
    setIsAnnouncementModalOpen(true);
  };

  // Delete Handler: Delete Logbook
  const handleDeleteLogbook = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan logbook ini?")) return;
    try {
      const res = await fetch(`/api/admin/logbook?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setLogbooks((prev) => prev.filter((b) => b.id !== id));
      } else {
        alert("Gagal menghapus logbook: " + (data.error || ""));
      }
    } catch (err) {
      console.error("Delete logbook error", err);
    }
  };

  // Delete Handler: Delete Laporan
  const handleDeleteLaporan = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus berkas laporan ini?")) return;
    try {
      const res = await fetch(`/api/admin/laporan?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setLaporans((prev) => prev.filter((lap) => lap.id !== id));
      } else {
        alert("Gagal menghapus laporan: " + (data.error || ""));
      }
    } catch (err) {
      console.error("Delete laporan error", err);
    }
  };

  // Filtered lists
  const normalizedKabupaten = (value?: string) => (value || "Bireuen").trim();
  const kabupatenOptions = Array.from(new Set([
    ...gampongs.map((g) => normalizedKabupaten(g.kabupaten)),
    ...profiles.map((p) => normalizedKabupaten(p.kabupaten)),
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const kecamatanOptions = Array.from(new Set([
    ...gampongs.filter((g) => !studentKabupatenFilter || normalizedKabupaten(g.kabupaten) === studentKabupatenFilter).map((g) => g.kecamatan.trim()),
    ...profiles.filter((p) => !studentKabupatenFilter || normalizedKabupaten(p.kabupaten) === studentKabupatenFilter).map((p) => p.kecamatan.trim()),
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const gampongOptions = Array.from(new Set([
    ...gampongs.filter((g) =>
      (!studentKabupatenFilter || normalizedKabupaten(g.kabupaten) === studentKabupatenFilter) &&
      (!studentKecamatanFilter || g.kecamatan.trim() === studentKecamatanFilter)
    ).map((g) => g.nama.trim()),
    ...profiles.filter((p) =>
      (!studentKabupatenFilter || normalizedKabupaten(p.kabupaten) === studentKabupatenFilter) &&
      (!studentKecamatanFilter || p.kecamatan.trim() === studentKecamatanFilter)
    ).map((p) => p.gampong.trim()),
  ].filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.npm.includes(searchQuery) ||
      p.program.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.gampong.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.kkmSemester || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch &&
      (!studentKabupatenFilter || normalizedKabupaten(p.kabupaten) === studentKabupatenFilter) &&
      (!studentKecamatanFilter || p.kecamatan.trim() === studentKecamatanFilter) &&
      (!studentGampongFilter || p.gampong.trim() === studentGampongFilter);
  });

  const pendingProfiles = filteredProfiles.filter((p) => p.status === "Menunggu Verifikasi");

  // Kelompokkan verifikasi mahasiswa sesuai KKM Ganjil / Genap yang diambil dari pendaftaran
  const kkmGroups: Array<{ key: string; label: string; color: string; items: typeof filteredProfiles }> = [
    {
      key: "Ganjil",
      label: "KKM Ganjil",
      color: "bg-emerald-50 border-emerald-200 text-emerald-800",
      items: filteredProfiles.filter((p) => (p.kkmSemester || "").toLowerCase() === "ganjil"),
    },
    {
      key: "Genap",
      label: "KKM Genap",
      color: "bg-blue-50 border-blue-200 text-blue-800",
      items: filteredProfiles.filter((p) => (p.kkmSemester || "").toLowerCase() === "genap"),
    },
    {
      key: "Belum",
      label: "Belum Memilih KKM",
      color: "bg-amber-50 border-amber-200 text-amber-800",
      items: filteredProfiles.filter((p) => {
        const v = (p.kkmSemester || "").toLowerCase();
        return v !== "ganjil" && v !== "genap";
      }),
    },
  ];
  const pendingKkmGroups: Array<{ key: string; label: string; color: string; items: typeof filteredProfiles }> = [
    {
      key: "Ganjil",
      label: "KKM Ganjil",
      color: "bg-emerald-50 border-emerald-200 text-emerald-800",
      items: pendingProfiles.filter((p) => (p.kkmSemester || "").toLowerCase() === "ganjil"),
    },
    {
      key: "Genap",
      label: "KKM Genap",
      color: "bg-blue-50 border-blue-200 text-blue-800",
      items: pendingProfiles.filter((p) => (p.kkmSemester || "").toLowerCase() === "genap"),
    },
    {
      key: "Belum",
      label: "Belum Memilih KKM",
      color: "bg-amber-50 border-amber-200 text-amber-800",
      items: pendingProfiles.filter((p) => {
        const v = (p.kkmSemester || "").toLowerCase();
        return v !== "ganjil" && v !== "genap";
      }),
    },
  ];
  const totalStudents = profiles.length;
  const verifiedStudents = profiles.filter((profile) => isDocumentVerified(profile.status)).length;
  const needsChangesStudents = profiles.filter((profile) => needsRepair(profile)).length;
  const unverifiedStudents = totalStudents - verifiedStudents;
  const verificationPercentage = totalStudents > 0 ? Math.round((verifiedStudents / totalStudents) * 100) : 0;
  const statusFilteredProfiles = filteredProfiles.filter((profile) => {
    if (studentStatusFilter === "verified") return isDocumentVerified(profile.status);
    if (studentStatusFilter === "changes") return needsRepair(profile);
    if (studentStatusFilter === "unverified") return !isDocumentVerified(profile.status);
    return true;
  });
  const kkmStudentGroups = kkmGroups
    .map((group) => {
      const sortedItems = [...group.items].sort((a, b) => {
        const aVerified = isDocumentVerified(a.status);
        const bVerified = isDocumentVerified(b.status);
        if (aVerified !== bVerified) return bVerified ? 1 : -1;
        const aAngkatan = parseInt(a.angkatan || "0", 10);
        const bAngkatan = parseInt(b.angkatan || "0", 10);
        if (aAngkatan !== bAngkatan) return aAngkatan - bAngkatan;
        return a.nama.localeCompare(b.nama);
      });
      return {
        ...group,
        items: sortedItems.filter((profile) => statusFilteredProfiles.some((candidate) => candidate.npm === profile.npm)),
      };
    })
    .filter((group) => group.items.length > 0);
  const filteredLogbooks = logbooks.filter(
    (l) =>
      l.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.npm.includes(searchQuery) ||
      l.lokasi.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLaporans = laporans.filter(
    (l) =>
      l.namaFile.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.jenis.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.npm.includes(searchQuery)
  );

  // Pengelompokan Logbook & Laporan per Gampong
  const npmToGampong = new Map(profiles.map((p) => [p.npm, p.gampong || "Tanpa Gampong"]));

  const logbookGroups: Array<{ gampong: string; mandiri: LogbookRecord[]; kelompok: LogbookRecord[] }> = [];
  {
    const byGampong = new Map<string, { mandiri: LogbookRecord[]; kelompok: LogbookRecord[] }>();
    for (const b of filteredLogbooks) {
      const gampong = npmToGampong.get(b.npm) || "Tanpa Gampong";
      let entry = byGampong.get(gampong);
      if (!entry) {
        entry = { mandiri: [], kelompok: [] };
        byGampong.set(gampong, entry);
      }
      if (b.kategori === "Kelompok") entry.kelompok.push(b);
      else entry.mandiri.push(b);
    }
    for (const [gampong, entry] of byGampong) logbookGroups.push({ gampong, ...entry });
  }

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
  laporanGroups.sort((a, b) => a.gampong.localeCompare(b.gampong));

  const toggleLaporanGampong = (gampong: string) => {
    setExpandedLaporanGampongs((current) => {
      const next = new Set(current);
      if (next.has(gampong)) next.delete(gampong);
      else next.add(gampong);
      return next;
    });
  };

  const filteredGampongs = gampongs.filter(
    (g) =>
      g.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.skema.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.kecamatan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDpls = dpls.filter(
    (d) =>
      d.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.nidn.includes(searchQuery) ||
      d.skema.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBerita = berita.filter(
    (b) =>
      b.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.kategori.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.penulis.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "1.2 MB";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A202C]">
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        stats={{ ...stats, belumTerverifikasi: unverifiedStudents }}
        session={session}
        onLogout={handleLogout}
      />
      <div className={`${isSidebarCollapsed ? "md:ml-20" : "md:ml-64"} min-w-0 transition-all duration-300`}>
        <main className="dashboard-page mx-auto max-w-full space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-8 lg:px-8">
        
        {/* Navigation Header Bar */}
        <div className="flex flex-col gap-3 border-b border-[#E2E8F0] pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="btn-secondary shrink-0 p-2 md:hidden"
              aria-label="Buka menu navigasi admin"
            >
              <Menu className="h-4 w-4 text-[#0F5132]" />
            </button>
            <Link href="/" className="btn-secondary min-w-0 px-2.5 py-2 text-xs shadow-xs sm:px-3">
              <ArrowLeft className="w-4 h-4 text-[#0F5132]" />
              <span className="hidden sm:inline">Kembali ke Portal Utama</span>
              <span className="sm:hidden">Portal</span>
            </Link>

            <span className="badge-academic hidden text-xs font-bold bg-[#E6F4EA] text-[#0F5132] border-[#B7E1CD] lg:inline-flex">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0F5132]" />
              Role: Admin Executive LPPM
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end sm:gap-3">
            {session && (
              <button
                onClick={handleLogout}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-red-600 hover:bg-red-50 border-red-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar (Logout)</span>
              </button>
            )}
          </div>
        </div>

        {/* Executive Banner Card - hanya tampil di Dashboard */}
        {activeTab === "overview" && (
        <div className="academic-card space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-xs sm:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
            <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0F5132] text-xl font-extrabold text-white shadow-sm sm:h-14 sm:w-14 sm:text-2xl">
                {(session?.nama || "A").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="break-words text-lg font-extrabold leading-tight text-[#1A202C] sm:text-2xl">
                  {session?.nama || "Administrator Utama LPPM"}
                </h1>
                <p className="text-xs text-[#718096] mt-0.5">
                  Panel Kelola Gampong (Reguler, Internasional, Non-Reguler), Akun DPL, Mahasiswa &amp; Database
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:items-center">
              <button
                onClick={() => openGampongForm()}
                className="btn-primary text-xs py-2 px-3 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Tambah Gampong</span>
              </button>

              <button
                onClick={() => openDplForm()}
                className="btn-secondary text-xs py-2 px-3 shadow-xs cursor-pointer border-[#0F5132] text-[#0F5132]"
              >
                <UserPlus className="w-4 h-4 text-[#0F5132]" />
                <span>Buat Akun DPL</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-3">
            <button type="button" onClick={() => openStudentList("all")} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-400 hover:bg-white">
              <span className="block text-xs font-semibold text-slate-500">Total Mahasiswa</span>
              <span className="mt-1 block text-2xl font-extrabold text-slate-900">{isLoading ? "—" : totalStudents}</span>
              <span className="mt-2 block text-[11px] text-slate-500">Lihat semua mahasiswa</span>
            </button>
            <button type="button" onClick={() => openStudentList("verified")} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left transition hover:border-emerald-400 hover:bg-white">
              <span className="block text-xs font-semibold text-emerald-700">Sudah Terverifikasi</span>
              <span className="mt-1 block text-2xl font-extrabold text-emerald-900">{isLoading ? "—" : verifiedStudents}</span>
              <span className="mt-2 block text-[11px] text-emerald-700">Data mahasiswa sudah terkunci</span>
            </button>
            <button type="button" onClick={() => openStudentList("unverified")} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:border-amber-400 hover:bg-white">
              <span className="block text-xs font-semibold text-amber-700">Belum Terverifikasi</span>
              <span className="mt-1 block text-2xl font-extrabold text-amber-900">{isLoading ? "—" : unverifiedStudents}</span>
              <span className="mt-2 block text-[11px] text-amber-700">Termasuk {needsChangesStudents} perlu perbaikan</span>
            </button>
          </div>

          <div className="grid gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] p-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#2D3748]">
                <span>Progress verifikasi</span>
                <span>{verificationPercentage}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-[#0F5132] transition-all" style={{ width: `${verificationPercentage}%` }} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
                <span className={`inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs font-bold ${isProfileEditEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-600"}`}>
                  Edit profil {isProfileEditEnabled ? "Dibuka" : "Ditutup"}
                </span>
                <button type="button" onClick={handleToggleProfileEdit} disabled={isUpdatingProfileSetting} aria-pressed={isProfileEditEnabled} className={`rounded-lg px-4 py-2 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60 ${isProfileEditEnabled ? "bg-red-600 hover:bg-red-700" : "bg-[#0F5132] hover:bg-[#0B422E]"}`}>
                  {isUpdatingProfileSetting ? "Menyimpan..." : isProfileEditEnabled ? "Nonaktifkan Edit Profil" : "Aktifkan Edit Profil"}
                </button>
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
                <span className={`inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs font-bold ${activeLogbookWeek ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-600"}`}>
                  Logbook {activeLogbookWeek ? `Minggu ${activeLogbookWeek} Dibuka` : "Ditutup"}
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {[1, 2, 3].map((week) => (
                    <button
                      key={week}
                      type="button"
                      onClick={() => handleSetActiveLogbookWeek(week)}
                      disabled={isUpdatingLogbookWeek}
                      className={`rounded-md px-2 py-1.5 text-xs font-bold disabled:opacity-60 ${activeLogbookWeek === week ? "bg-[#0F5132] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                    >
                      M{week}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => handleSetActiveLogbookWeek(null)} disabled={isUpdatingLogbookWeek || !activeLogbookWeek} className="rounded-md border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                  Tutup Semua
                </button>
              </div>
              <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3">
                <span className={`inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs font-bold ${isBerkasUploadEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-600"}`}>
                  Upload berkas {isBerkasUploadEnabled ? "Dibuka" : "Ditutup"}
                </span>
                <button type="button" onClick={handleToggleBerkasUpload} disabled={isUpdatingBerkasSetting} aria-pressed={isBerkasUploadEnabled} className={`rounded-lg px-4 py-2 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60 ${isBerkasUploadEnabled ? "bg-red-600 hover:bg-red-700" : "bg-[#0F5132] hover:bg-[#0B422E]"}`}>
                  {isUpdatingBerkasSetting ? "Menyimpan..." : isBerkasUploadEnabled ? "Nonaktifkan Upload" : "Aktifkan Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
        )}


        {/* Search Bar */}
        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] flex items-center gap-3">
          <Search className="w-4 h-4 text-[#718096]" />
          <input
            type="text"
            placeholder="Cari data gampong, NIDN DPL, nama mahasiswa, atau skema KKM..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs academic-input border-0 focus:ring-0 bg-transparent"
          />
        </div>
        {/* TAB 1: KELOLA GAMPONG & POSKO (REGULER, INTERNASIONAL, NON-REGULER) */}
        {activeTab === "gampong" && (
          <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#1A202C]">Data Gampong &amp; Posko Pengabdian KKM</h3>
                <p className="text-xs text-[#718096]">Admin dapat menambahkan lokasi KKM Reguler, KKM Internasional, dan KKM Non-Reguler.</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <label className="btn-secondary text-xs py-2 px-3 shadow-xs cursor-pointer flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#0F5132]" />
                  <span>{isUploadingGampongExcel ? "Mengimpor..." : "Import Excel Gampong & Posko"}</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleGampongExcelUpload}
                    className="hidden"
                    disabled={isUploadingGampongExcel}
                  />
                </label>
                <button
                  onClick={() => openGampongForm()}
                  className="btn-primary text-xs py-2 px-3 shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>Tambah Gampong</span>
                </button>
              </div>
            </div>

            {filteredGampongs.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#718096] space-y-2">
                <MapPin className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                <p>Belum ada data gampong/posko tersimpan di database.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0] text-[#718096] uppercase font-bold text-[10px]">
                      <th className="py-3 px-4">Nama Gampong / Wilayah</th>
                      <th className="py-3 px-4">Skema KKM</th>
                      <th className="py-3 px-4">Kecamatan / Daerah</th>
                      <th className="py-3 px-4">DPL Pembimbing Lapangan</th>
                      <th className="py-3 px-4">Keuchik / Mitra</th>
                      <th className="py-3 px-4">Nama Posko</th>
                      <th className="py-3 px-4">Kuota</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filteredGampongs.map((g) => (
                      <tr key={g.id} className="hover:bg-[#F8F9FA]/60">
                        <td className="py-3 px-4 font-bold text-[#1A202C]">{g.nama}</td>
                        <td className="py-3 px-4 font-semibold text-[#0F5132]">
                          <span className="badge-academic text-[10px] bg-[#E6F4EA] text-[#0F5132] border-[#B7E1CD]">
                            {g.skema}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#4A5568]">{g.kecamatan}</td>
                        <td className="py-3 px-4 text-[#0F5132] font-semibold">{g.dpl || "Belum Ditentukan"}</td>
                        <td className="py-3 px-4 text-[#2D3748]">
                          <div>{g.keuchik || "-"}</div>
                          <span className="text-[10px] text-[#718096]">{g.kontakKeuchik}</span>
                        </td>
                        <td className="py-3 px-4 text-[#0F5132] font-semibold">{g.posko}</td>
                        <td className="py-3 px-4 font-bold">{g.kuota || 15} Mhs</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openGampongForm(g)}
                            className="mr-2 p-1.5 text-[#0F5132] hover:bg-[#E6F4EA] rounded border border-[#B7E1CD] cursor-pointer"
                            title="Edit Gampong dan Posko"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => g.id && handleDeleteGampong(g.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200 cursor-pointer"
                            title="Hapus Gampong"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: KELOLA AKUN DPL (CREATE AKUN DPL) */}
        {activeTab === "dpl" && (
          <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#1A202C]">Manajemen Akun Dosen Pembimbing Lapangan (DPL)</h3>
                <p className="text-xs text-[#718096]">Admin dapat membuatkan akun login DPL baru (NIDN &amp; Password) untuk bimbingan KKM.</p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <label className="btn-secondary text-xs py-2 px-4 shadow-xs cursor-pointer flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#0F5132]" />
                  <span>{isImportingExcel ? "Mengimpor..." : "Import Excel DPL"}</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleImportDplsExcel}
                    className="hidden"
                    disabled={isImportingExcel}
                  />
                </label>
                <button
                  onClick={() => openDplForm()}
                  className="btn-primary text-xs py-2 px-4 shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4 text-white" />
                  <span>Buat Akun DPL Baru</span>
                </button>
              </div>
            </div>

            {filteredDpls.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#718096] space-y-2">
                <UserCheck className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                <p>Belum ada akun DPL terdaftar di database.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0] text-[#718096] uppercase font-bold text-[10px]">
                      <th className="py-3 px-4">Nama DPL &amp; Gelar</th>
                      <th className="py-3 px-4">NIDN / Username</th>
                      <th className="py-3 px-4">Fakultas</th>
                      <th className="py-3 px-4">Kategori Skema KKM</th>
                      <th className="py-3 px-4">Wilayah Kecamatan</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filteredDpls.map((d) => (
                      <tr key={d.id} className="hover:bg-[#F8F9FA]/60">
                        <td className="py-3 px-4 font-bold text-[#1A202C]">{d.nama}</td>
                        <td className="py-3 px-4 font-mono font-bold text-[#0F5132]">{d.nidn}</td>
                        <td className="py-3 px-4 text-[#4A5568]">{d.fakultas}</td>
                        <td className="py-3 px-4">
                          <span className="badge-academic text-[10px] bg-[#E6F4EA] text-[#0F5132] border-[#B7E1CD]">
                            {d.skema}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#2D3748]">{d.kecamatan || "Peusangan"}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openDplForm(d)}
                            className="mr-2 p-1.5 text-[#0F5132] hover:bg-[#E6F4EA] rounded border border-[#B7E1CD] cursor-pointer"
                            title="Edit Akun DPL"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => d.id && handleDeleteDpl(d.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200 cursor-pointer"
                            title="Hapus Akun DPL"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

{activeTab === "overview" && (
          <div className="space-y-6">
            <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-4 shadow-xs">
              <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-[#1A202C]">Struktur Pelaksana LPPM UMuslim</h3>
                  <p className="text-xs text-[#718096]">Data ini akan tampil di halaman publik bagian Tentang KKM.</p>
                </div>
                <span className="badge-academic text-[10px] bg-[#E6F4EA] text-[#0F5132] border-[#B7E1CD]">{struktur.length} item</span>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-lg border border-[#E2E8F0] bg-[#F8F9FA] p-4 space-y-3">
                  {struktur.length === 0 ? (
                    <div className="rounded border border-dashed border-[#CBD5E1] p-4 text-center text-[11px] text-[#718096]">
                      Belum ada item struktur yang tersimpan. Tambahkan data awal sesuai kebutuhan admin.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {struktur.map((item) => (
                        <div key={item.id} className="rounded border border-[#E2E8F0] bg-white p-3 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                          <div>
                            <div className="font-semibold text-[#1A202C] text-xs">{item.label}</div>
                            <div className="text-[11px] text-[#4A5568]">{item.value}</div>
                          </div>
                          <button
                            onClick={() => item.id && handleDeleteStruktur(item.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200 cursor-pointer self-start"
                            title="Hapus Item Struktur"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleAddStruktur} className="rounded-lg border border-[#E2E8F0] bg-white p-4 space-y-3">
                  <div>
                    <h4 className="font-extrabold text-sm text-[#1A202C]">Tambah Item Struktur</h4>
                    <p className="text-[11px] text-[#718096]">Contoh: Ketua LPPM, Kepala Pusat Pengabdian, Sekretariat Posko.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-[#2D3748]">Label / Jabatan</label>
                    <input
                      type="text"
                      value={newStrukturForm.label}
                      onChange={(e) => setNewStrukturForm({ ...newStrukturForm, label: e.target.value })}
                      placeholder="Contoh: Ketua LPPM Universitas Almuslim"
                      className="academic-input text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-[#2D3748]">Nilai / Nama</label>
                    <input
                      type="text"
                      value={newStrukturForm.value}
                      onChange={(e) => setNewStrukturForm({ ...newStrukturForm, value: e.target.value })}
                      placeholder="Contoh: Dr. Saifuddin, M.Pd."
                      className="academic-input text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-[#2D3748]">Urutan Tampil</label>
                    <input
                      type="number"
                      min="0"
                      value={newStrukturForm.urutan}
                      onChange={(e) => setNewStrukturForm({ ...newStrukturForm, urutan: Number(e.target.value) })}
                      className="academic-input text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingStruktur}
                    className="btn-primary text-xs py-2 px-4 shadow-xs cursor-pointer w-full flex items-center justify-center gap-2"
                  >
                    {isSubmittingStruktur ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 text-white" />}
                    <span>{isSubmittingStruktur ? "Menyimpan..." : "Simpan Item Struktur"}</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Layanan Pengaduan & Informasi */}
            <div className="rounded-lg bg-white border border-[#CBD5E1] p-6 space-y-3 shadow-xs academic-card">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-[#1A202C] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#0F5132]" />
                    Layanan Pengaduan &amp; Informasi
                  </h3>
                  <p className="text-xs text-[#718096]">Daftar pengaduan / pertanyaan yang masuk melalui layanan publik.</p>
                </div>
                <span className="badge-academic text-xs">{pengaduans.length} Masuk</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0] text-[#718096] uppercase font-bold text-[10px]">
                      <th className="py-2 px-3">Pengadu</th>
                      <th className="py-2 px-3">Judul</th>
                      <th className="py-2 px-3">Kategori</th>
                      <th className="py-2 px-3">Tanggal</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {pengaduans.length === 0 ? (
                      <tr>
                        <td className="py-8 text-center text-xs text-[#718096]" colSpan={6}>
                          Belum ada pengaduan yang masuk.
                        </td>
                      </tr>
                    ) : (
                      pengaduans.map((pd) => (
                        <tr key={pd.id} className="hover:bg-[#F8F9FA]/60">
                          <td className="py-2 px-3 font-semibold">{pd.namaPengadu || 'Anonim'}</td>
                          <td className="py-2 px-3">{pd.judul}</td>
                          <td className="py-2 px-3">{pd.kategori}</td>
                          <td className="py-2 px-3">{pd.createdAt}</td>
                          <td className="py-2 px-3">{pd.status}</td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => alert(pd.pesan || 'Tidak ada pesan')}
                                className="text-[#0F5132] hover:bg-[#E6F4EA] rounded border border-[#C6F6D5] px-3 py-1.5 text-[11px] font-semibold"
                              >Lihat</button>
                              <button
                                onClick={() => {
                                  const newStatus = pd.status === 'Baru' ? 'Diproses' : 'Selesai';
                                  fetch('/api/admin/pengaduan', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: pd.id, status: newStatus }),
                                  })
                                    .then((r) => r.json())
                                    .then((d) => {
                                      if (d.success) loadAdminData();
                                      else alert(d.error || 'Gagal memperbarui status');
                                    })
                                    .catch(() => alert('Gagal menghubungi server'));
                                }}
                                className="text-white bg-[#0F5132] hover:bg-[#0B422E] rounded px-3 py-1.5 text-[11px] font-semibold"
                              >Tanggapi</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: VERIFIKASI MAHASISWA */}
        {activeTab === "verify" && (
          <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-4 shadow-xs">
            <div className="flex flex-col gap-4 border-b border-[#E2E8F0] pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-base text-[#1A202C]">Verifikasi &amp; Kelola Mahasiswa</h3>
                  <p className="text-xs text-[#718096]">Setujui pendaftaran awal agar mahasiswa langsung masuk ke daftar Mahasiswa KKM dan dapat mengunggah berkas.</p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="badge-academic text-xs">{pendingProfiles.length} Menunggu Verifikasi</span>
                  <button
                    onClick={handleBulkApprove}
                    className="text-white bg-[#0F5132] hover:bg-[#0B422E] rounded px-3 py-1.5 text-[11px] font-semibold"
                  >
                    Setujui Terpilih
                  </button>
                <button
                  onClick={handleExportVerifiedStudents}
                  disabled={isBackingUp}
                  className="btn-secondary text-xs py-2 px-3 shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin text-[#0F5132]" /> : <Download className="w-4 h-4 text-[#0F5132]" />}
                  <span>Export Terverifikasi</span>
                </button>
                <button
                  onClick={() => setIsStudentModalOpen(true)}
                  className="btn-primary text-xs py-2 px-3 shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4 text-white" />
                  <span>Tambah Mahasiswa</span>
                </button>
              </div>
            </div>
            </div>

            {filteredProfiles.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#718096] space-y-2">
                <ShieldCheck className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                <p>Belum ada data mahasiswa di database.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Ringkasan KKM */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase">KKM Ganjil</div>
                      <div className="text-xs">{pendingKkmGroups.find(g=>g.key==="Ganjil")?.items.length} Menunggu Verifikasi</div>
                    </div>
                    <GraduationCap className="w-5 h-5 opacity-60" />
                  </div>
                  <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 text-blue-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase">KKM Genap</div>
                      <div className="text-xs">{pendingKkmGroups.find(g=>g.key==="Genap")?.items.length} Menunggu Verifikasi</div>
                    </div>
                    <GraduationCap className="w-5 h-5 opacity-60" />
                  </div>
                  <div className="p-3 rounded-lg border bg-amber-50 border-amber-200 text-amber-800 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase">Belum Memilih</div>
                      <div className="text-xs">{pendingKkmGroups.find(g=>g.key==="Belum")?.items.length} Menunggu Verifikasi</div>
                    </div>
                    <Clock className="w-5 h-5 opacity-60" />
                  </div>
                </div>

                {pendingKkmGroups.map((group) => (
                  <div key={group.key} className="space-y-3">
                    <div className={`flex items-center gap-2 border rounded-lg px-3 sm:px-4 py-2.5 ${group.color}`}>
                      <GraduationCap className="w-4 h-4 shrink-0" />
                      <h4 className="font-extrabold text-sm">{group.label}</h4>
                      <span className="text-[11px] font-bold ml-2 hidden sm:inline">
                        {group.items.length} Mahasiswa
                      </span>
                      <span className="badge-academic text-[10px] ml-auto bg-white/80 border-white/50">
                        {group.items.filter(p=>p.status==="Menunggu Verifikasi").length} Menunggu • {group.items.filter(p=>p.status?.toLowerCase().includes("terverifikasi")).length} Terverifikasi
                      </span>
                    </div>

                    {group.items.length === 0 ? (
                      <p className="text-xs text-[#A0AEC0] py-4 text-center bg-[#F8F9FA] border border-dashed rounded-lg">Tidak ada mahasiswa pada kelompok {group.label}.</p>
                    ) : (
                      <>
                        {/* Desktop Table */}
                        <div className="hidden sm:block overflow-x-auto border border-[#E2E8F0] rounded-lg">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0] text-[#718096] uppercase font-bold text-[10px]">
                                <th className="py-3 px-4 w-12">Pilih</th>
                                <th className="py-3 px-4">Mahasiswa</th>
                                <th className="py-3 px-4">Program / Fakultas</th>
                                <th className="py-3 px-4">Gampong / DPL</th>
                                <th className="py-3 px-4">KKM</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4 text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0]">
                              {group.items.map((p) => (
                                <tr key={p.npm} className="hover:bg-[#F8F9FA]/60">
                                  <td className="py-3 px-4">
                                    <input
                                      type="checkbox"
                                      checked={selectedApprovals.has(p.npm)}
                                      onChange={() => toggleSelectApproval(p.npm)}
                                      className="w-4 h-4 cursor-pointer"
                                      title="Pilih untuk bulk approve"
                                    />
                                  </td>
                                  <td className="py-3 px-4 font-bold text-[#1A202C]">
                                    <div className="truncate max-w-[160px]">{p.nama}</div>
                                    <span className="text-[10px] text-[#718096] font-normal font-mono">NPM: {p.npm}</span>
                                  </td>
                                  <td className="py-3 px-4 text-[#4A5568]">
                                    <div className="font-semibold">{p.program}</div>
                                    <span className="text-[10px] text-[#718096]">{p.fakultas} / {p.prodi}</span>
                                  </td>
                                  <td className="py-3 px-4 text-[#2D3748]">
                                    <div className="truncate max-w-[140px]">{p.gampong || "Belum Ditentukan"}</div>
                                    <span className="text-[10px] text-[#0F5132]">DPL: {p.dpl || "Belum Ditentukan"}</span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={`badge-academic text-[10px] ${p.kkmSemester?.toLowerCase()==="ganjil" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : p.kkmSemester?.toLowerCase()==="genap" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                                      {p.kkmSemester || "Belum"}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={`badge-academic text-[10px] ${
                                      p.status?.trim().toLowerCase() === "terverifikasi / aktif"
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : "bg-[#E2E8F0] text-[#4A5568] border-[#CBD5E1]"
                                    }`}>
                                      {p.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => fetchVerificationDetails(p.npm)}
                                        className="p-1.5 text-[#0F5132] hover:bg-green-50 rounded border border-green-200 cursor-pointer"
                                        title="Lihat Detail & Berkas"
                                      >
                                        <Search className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditStudentForm({
                                            npm: p.npm,
                                            nama: p.nama,
                                            fakultas: p.fakultas,
                                            prodi: p.prodi,
                                            program: p.program,
                                            kecamatan: p.kecamatan || "Peusangan",
                                            gampong: p.gampong || "",
                                            angkatan: p.angkatan || "",
                                            lokasi: p.lokasi || "",
                                            dpl: p.dpl || "",
                                            ipk: p.ipk || "3.50",
                                          });
                                          setIsEditStudentModalOpen(true);
                                        }}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-blue-200 cursor-pointer"
                                        title="Edit Data Mahasiswa"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteStudent(p.npm)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200 cursor-pointer"
                                        title="Hapus Mahasiswa"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="grid grid-cols-1 gap-3 sm:hidden">
                          {group.items.map((p) => (
                            <div key={p.npm} className="bg-white border border-[#CBD5E1] rounded-xl p-3.5 space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-sm text-[#1A202C] truncate">{p.nama}</div>
                                  <div className="text-[11px] font-mono text-[#718096]">NPM: {p.npm}</div>
                                  <div className="text-xs text-[#4A5568] mt-1">{p.fakultas} / {p.prodi}</div>
                                  <div className="text-[11px] text-[#0F5132] font-semibold">{p.program}</div>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={selectedApprovals.has(p.npm)}
                                  onChange={() => toggleSelectApproval(p.npm)}
                                  className="w-4 h-4 cursor-pointer mt-1 accent-[#0F5132]"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded p-2">
                                  <span className="text-[10px] text-[#718096] block">Gampong</span>
                                  <strong className="text-[#1A202C] truncate block">{p.gampong || "-"}</strong>
                                </div>
                                <div className="bg-[#F8F9FA] border border-[#E2E8F0] rounded p-2">
                                  <span className="text-[10px] text-[#718096] block">KKM</span>
                                  <span className={`inline-flex badge-academic text-[10px] mt-1 ${p.kkmSemester?.toLowerCase()==="ganjil" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : p.kkmSemester?.toLowerCase()==="genap" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                                    {p.kkmSemester || "Belum"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className={`badge-academic text-[10px] ${
                                  p.status?.trim().toLowerCase() === "terverifikasi / aktif"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-[#E2E8F0] text-[#4A5568] border-[#CBD5E1]"
                                }`}>
                                  {p.status}
                                </span>
                                <span className="text-[11px] text-[#718096]">{p.tanggalDaftar}</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => fetchVerificationDetails(p.npm)}
                                  className="flex-1 btn-secondary text-xs py-2 justify-center"
                                >
                                  <Search className="w-3.5 h-3.5" /> Detail
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(p.npm)}
                                  className="btn-secondary text-xs py-2 px-3 text-red-600 border-red-200"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {verificationDetails.profile && (
              <div className="rounded-lg border border-[#CBD5E1] bg-[#F8F9FA] p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h4 className="font-extrabold text-sm text-[#1A202C]">Detail Verifikasi Mahasiswa</h4>
                    <p className="text-[11px] text-[#718096]">Informasi profil dan berkas yang sudah terunggah.</p>
                  </div>
                  <button
                    onClick={() => {
                      setVerificationDetails({ profile: null, logbooks: [], laporans: [] });
                    }}
                    className="text-[#4A5568] text-[11px] hover:text-[#1A202C]"
                  >
                    Tutup Detail
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="font-semibold text-[#1A202C]">Nama</div>
                      <div>{verificationDetails.profile.nama}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-[#1A202C]">NPM</div>
                      <div>{verificationDetails.profile.npm}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-[#1A202C]">Status</div>
                      <div>{verificationDetails.profile.status}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-[#4A5568]">
                    <div className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                      <div className="font-semibold text-[#1A202C] text-[11px] mb-1">Foto Profil</div>
                      {verificationDetails.profile.foto ? (
                        <Image
                          src={verificationDetails.profile.foto}
                          alt="Foto Profil Mahasiswa"
                          width={260}
                          height={200}
                          className="rounded-md object-cover w-full h-40"
                        />
                      ) : (
                        <div className="text-[11px] text-[#718096]">Belum ada foto profil.</div>
                      )}
                    </div>
                    <div className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                      <div className="font-semibold text-[#1A202C] text-[11px] mb-1">Ringkasan Pendaftaran</div>
                      <div className="text-[11px] text-[#4A5568] space-y-1">
                        <div><strong>Gampong:</strong> {verificationDetails.profile.gampong || "Belum ditentukan"}</div>
                        <div><strong>DPL:</strong> {verificationDetails.profile.dpl || "Belum ditentukan"}</div>
                        <div><strong>Lokasi Posko:</strong> {verificationDetails.profile.posko || "Belum ditentukan"}</div>
                        <div><strong>Tanggal Daftar:</strong> {verificationDetails.profile.tanggalDaftar}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                    <div className="font-semibold text-[#1A202C] text-[11px] mb-2">Berkas Persyaratan yang Diunggah</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        { label: "Slip Pembayaran", url: verificationDetails.profile.slipPembayaran || verificationDetails.profile.buktiPembayaran },
                        { label: "Slip SPP", url: verificationDetails.profile.slipSpp },
                        { label: "Transkrip Nilai", url: verificationDetails.profile.transkrip },
                        { label: "KRS", url: verificationDetails.profile.krs },
                        { label: "Pas Photo 3x4", url: verificationDetails.profile.foto },
                        { label: "Asuransi Jiwa", url: verificationDetails.profile.asuransiJiwa },
                      ].map((item) => (
                        <div key={item.label} className="rounded-lg border border-[#E2E8F0] bg-[#F8F9FA] p-3">
                          <div className="font-semibold text-[#1A202C] text-[11px] mb-1">{item.label}</div>
                          {item.url ? (
                            <AdminBerkasPreview label={item.label} url={item.url} />
                          ) : (
                            <div className="text-[11px] text-[#718096]">Belum diunggah</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: MAHASISWA KKM DAN VERIFIKASI */}
        {activeTab === "mahasiswaKKM" && (
          <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-4 shadow-xs">
            <div className="flex flex-col gap-4 border-b border-[#E2E8F0] pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-extrabold text-base text-[#1A202C]">Mahasiswa KKM</h3>
                <p className="text-xs text-[#718096]">Kelola data dan verifikasi mahasiswa dalam satu halaman.</p>
              </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handleExportVerifiedStudents} disabled={isBackingUp} className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50">
                    {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin text-[#0F5132]" /> : <Download className="w-4 h-4 text-[#0F5132]" />}
                    <span>{isBackingUp ? "Mengekspor..." : "Export Terverifikasi"}</span>
                  </button>
                  <button type="button" onClick={handleExportLocationFilteredStudents} disabled={isBackingUp} className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50">
                    {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin text-[#0F5132]" /> : <Download className="w-4 h-4 text-[#0F5132]" />}
                    <span>{isBackingUp ? "Mengekspor..." : "Export Sesuai Lokasi"}</span>
                  </button>
                  <button type="button" onClick={() => setIsStudentModalOpen(true)} className="btn-primary px-3 py-2 text-xs flex items-center gap-1.5 shadow-xs cursor-pointer">
                    <UserPlus className="h-4 w-4" /> <span>Tambah Mahasiswa</span>
                  </button>
                  <button type="button" onClick={handleAddAngkatan} className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5 shadow-xs cursor-pointer">
                    <Plus className="h-4 w-4" /> <span>Tambah Angkatan</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  ["all", "Semua", totalStudents],
                  ["unverified", "Belum Diverifikasi", unverifiedStudents],
                  ["verified", "Terverifikasi", verifiedStudents],
                  ["changes", "Perlu Perbaikan", needsChangesStudents],
                ] as const).map(([value, label, count]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStudentStatusFilter(value)}
                    className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${studentStatusFilter === value ? "border-[#0F5132] bg-[#0F5132] text-white" : "border-[#CBD5E1] bg-white text-[#4A5568] hover:bg-[#F8F9FA]"}`}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  value={studentKabupatenFilter}
                  onChange={(e) => {
                    setStudentKabupatenFilter(e.target.value);
                    setStudentKecamatanFilter("");
                    setStudentGampongFilter("");
                  }}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#2D3748]"
                >
                  <option value="">Semua Kabupaten</option>
                  {kabupatenOptions.map((kabupaten) => <option key={kabupaten} value={kabupaten}>{kabupaten}</option>)}
                </select>
                <select
                  value={studentKecamatanFilter}
                  onChange={(e) => {
                    setStudentKecamatanFilter(e.target.value);
                    setStudentGampongFilter("");
                  }}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#2D3748]"
                >
                  <option value="">Semua Kecamatan</option>
                  {kecamatanOptions.map((kecamatan) => <option key={kecamatan} value={kecamatan}>{kecamatan}</option>)}
                </select>
                <select
                  value={studentGampongFilter}
                  onChange={(e) => setStudentGampongFilter(e.target.value)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#2D3748]"
                >
                  <option value="">Semua Gampong</option>
                  {gampongOptions.map((gampong) => <option key={gampong} value={gampong}>{gampong}</option>)}
                </select>
              </div>
            </div>

            {(() => {
              if (kkmStudentGroups.length === 0) {
                return (
                  <div className="p-8 text-center text-xs text-[#718096] space-y-2">
                    <Users className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                    <p>Tidak ada mahasiswa yang sesuai dengan pencarian atau filter.</p>
                  </div>
                );
              }
              return (
                <div className="space-y-6">
                  {kkmStudentGroups.map((group) => (
                    <div key={group.key} className="space-y-3">
                      <div className={`flex items-center gap-2 border rounded-lg px-3 sm:px-4 py-2.5 ${group.color}`}>
                        <Users className="w-4 h-4" />
                        <h4 className="font-extrabold text-sm">{group.label}</h4>
                        <span className="badge-academic text-[10px] ml-auto bg-white/80">{group.items.length} Mahasiswa</span>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {group.items.map((p) => {
                          const berkasList = [
                            { label: "Slip Pembayaran", url: (p as any).slipPembayaran || (p as any).buktiPembayaran, icon: "💳" },
                            { label: "Slip SPP", url: (p as any).slipSpp, icon: "🧾" },
                            { label: "Transkrip Nilai", url: (p as any).transkrip, icon: "📄" },
                            { label: "KRS", url: (p as any).krs, icon: "📋" },
                            { label: "Pas Photo 3x4", url: (p as any).foto, icon: "🖼️", note: "Merah, almamater, jilbab putih" },
                            { label: "Asuransi Jiwa", url: (p as any).asuransiJiwa, icon: "🛡️" },
                          ];
                           const uploadedCount = berkasList.filter(b=>b.url).length;
                           const isVerified = isDocumentVerified(p.status);
                           const berkasIssueKeys = ['slipPembayaran','slipSpp','transkrip','krs','pasFoto','asuransiJiwa'];
                           const wrongCount = berkasIssueKeys.filter((k) => getBerkasState(p.npm, k, p).status === 'x').length;
                           const needsRepairCard = isDocumentRejected(p.status) || wrongCount > 0;
                           const verifiedSorted = profiles.filter(pf => isDocumentVerified(pf.status)).sort((a,b) => {
                              const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.id || 0);
                              const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.id || 0);
                              if (aTime !== bTime) return aTime - bTime;
                              return (a.id || 0) - (b.id || 0);
                            });
                            const verifiedIndex = verifiedSorted.findIndex(v => v.npm === p.npm) + 1;
                            const nomorMahasiswa = isVerified ? `${p.angkatan || "XXX"}${String(verifiedIndex).padStart(3, "0")}` : (p.angkatan ? `Angkatan ${p.angkatan}` : "—");
                           const isExpanded = expandedKkmStudentNpm === p.npm;
                           const placement = placementForms[p.npm] || {
                             gampong: p.gampong === "Belum Ditentukan" ? "" : p.gampong || "",
                             dpl: p.dpl === "Belum Ditentukan" ? "" : p.dpl || "",
                           };
                          return (
                            <div
                              key={p.npm}
                              className={`rounded-xl border overflow-hidden transition-colors ${isVerified ? "border-emerald-400 bg-emerald-50/40 shadow-sm" : needsRepairCard ? "border-amber-300 bg-amber-50/40 shadow-sm" : "border-[#CBD5E1] bg-white"}`}
                            >
                              <div className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isExpanded ? "border-b" : ""} ${isVerified ? "bg-emerald-100/70 border-emerald-200" : needsRepairCard ? "bg-amber-100/70 border-amber-200" : "bg-[#F8F9FA] border-[#E2E8F0]"}`}>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    {editingAngkatanNpm === p.npm ? (
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="text"
                                          value={angkatanInput}
                                          onChange={(e) => setAngkatanInput(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveAngkatan(p.npm);
                                            if (e.key === "Escape") handleCancelAngkatan();
                                          }}
                                          placeholder="Contoh: 30"
                                          className="w-24 px-2 py-1 text-xs border border-[#0F5132] rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#0F5132]/20"
                                          autoFocus
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleSaveAngkatan(p.npm)}
                                          className="text-xs px-2 py-1 bg-[#0F5132] text-white rounded hover:bg-[#0B422E]"
                                        >
                                          Simpan
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleCancelAngkatan}
                                          className="text-xs px-2 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                                        >
                                          Batal
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <span className={`font-mono text-xs px-2 py-0.5 rounded border ${isVerified ? "bg-emerald-100 text-emerald-800 border-emerald-300" : needsRepairCard ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-gray-100 text-gray-700 border-gray-300"}`}>
                                           {nomorMahasiswa}
                                         </span>
                                        <button
                                          type="button"
                                          onClick={() => handleEditAngkatan(p)}
                                          className="text-xs text-[#0F5132] hover:underline"
                                          title="Edit Angkatan"
                                        >
                                          ✏️
                                        </button>
                                      </>
                                    )}
                                    <div className={`font-bold text-sm truncate ${isVerified ? "text-emerald-950" : needsRepairCard ? "text-amber-950" : "text-[#1A202C]"}`}>{p.nama}</div>
                                  </div>
                                  <div className="text-xs text-[#718096] font-mono">NPM: {p.npm} • {p.fakultas} / {p.prodi} • {p.kkmSemester || "-"} • {p.kelasKuliah || "-"}</div>
                                  <div className="text-xs text-[#4A5568] mt-1">{p.gampong || "Tanpa Gampong"} • DPL: {p.dpl || "-"} • Posko: {p.posko || "-"}</div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                  {isVerified && (
                                    <span className="badge-academic text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Terverifikasi</span>
                                  )}
                                  {!isVerified && needsRepairCard && (
                                    <span className="badge-academic text-[10px] bg-amber-100 text-amber-800 border-amber-300">Perlu Perbaikan{wrongCount > 0 ? ` • ${wrongCount} berkas` : ""}</span>
                                  )}
                                  {!isVerified && !needsRepairCard && (
                                    <span className="badge-academic text-[10px] bg-slate-100 text-slate-600 border-slate-200">Belum Diverifikasi</span>
                                  )}
                                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${uploadedCount===6 ? "bg-emerald-100 text-emerald-700 border-emerald-200" : uploadedCount>0 ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>{uploadedCount}/6 Berkas</span>
                                  <button type="button" onClick={() => openEditStudent(p)} className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50">
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleKkmStudentDetail(p)}
                                    aria-expanded={isExpanded}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${isVerified ? "border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50" : needsRepairCard ? "border-amber-300 bg-white text-amber-800 hover:bg-amber-50" : "border-[#CBD5E1] bg-white text-[#2D3748] hover:bg-gray-50"}`}
                                  >
                                    Detail
                                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                              </div>
                              {isExpanded && (
                                <div className="p-4 space-y-4">
                                    <div className="rounded-xl border border-emerald-200 bg-white p-4">
                                      <div className="mb-3 flex items-start gap-2">
                                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                                        <div>
                                          <h5 className="text-sm font-extrabold text-emerald-950">Penempatan Mahasiswa</h5>
                                          <p className="text-[11px] text-emerald-700">Pilih gampong dan DPL untuk mahasiswa ini.</p>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                                        <label className="space-y-1 text-xs font-bold text-[#2D3748]">
                                          <span>Lokasi Gampong</span>
                                          <select
                                            value={placement.gampong}
                                            onChange={(event) => handlePlacementChange(p.npm, "gampong", event.target.value)}
                                            className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                          >
                                            <option value="">Pilih gampong</option>
                                            {gampongs.map((gampong) => (
                                              <option key={gampong.id ?? gampong.nama} value={gampong.nama}>
                                                {gampong.nama} — {gampong.kecamatan} — {gampong.posko || "Tanpa posko"}
                                              </option>
                                            ))}
                                          </select>
                                        </label>
                                        <label className="space-y-1 text-xs font-bold text-[#2D3748]">
                                          <span>Dosen Pembimbing Lapangan</span>
                                          <select
                                            value={placement.dpl}
                                            onChange={(event) => handlePlacementChange(p.npm, "dpl", event.target.value)}
                                            className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                          >
                                            <option value="">Pilih DPL</option>
                                            {dpls.map((dpl) => (
                                              <option key={dpl.id ?? dpl.nidn} value={dpl.nama}>{dpl.nama} — {dpl.nidn}</option>
                                            ))}
                                          </select>
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveStudentPlacement(p)}
                                          disabled={savingPlacementNpm === p.npm}
                                          className="btn-primary inline-flex min-h-10 items-center justify-center gap-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {savingPlacementNpm === p.npm ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                          Simpan Penempatan
                                        </button>
                                      </div>
                                    </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {berkasList.map((b) => {
                                      const keyMap: Record<string,string> = {"Slip Pembayaran":"slipPembayaran","Slip SPP":"slipSpp","Transkrip Nilai":"transkrip","KRS":"krs","Pas Photo 3x4":"pasFoto","Asuransi Jiwa":"asuransiJiwa"};
                                      const k = keyMap[b.label] || b.label;
                                      const st = getBerkasState(p.npm, k, p);
                                      const isOk = st.status === 'ok';
                                      const isX = st.status === 'x';
                                      const isPending = st.status === 'pending';
                                      return (
                                      <div key={b.label} className={`border rounded-lg p-3 flex flex-col gap-2 ${b.url ? (isX ? "bg-amber-50 border-amber-300" : isOk ? "bg-emerald-50 border-emerald-300" : "bg-emerald-50/50 border-emerald-200") : "bg-gray-50 border-gray-200"}`}>
                                        <div className="flex items-center gap-2">
                                          <span>{b.icon}</span>
                                          <span className="text-xs font-bold text-[#1A202C]">{b.label}</span>
                                          {b.url ? (isOk ? <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">✓ Sesuai</span> : isX ? <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">✗ Salah — perbaiki</span> : isPending ? <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">Menunggu periksa ulang</span> : <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">Belum diperiksa</span>) : <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">Belum</span>}
                                        </div>
                                        {b.note && <span className="text-[10px] text-amber-700">{b.note}</span>}
                                        {b.url ? (
                                          <AdminBerkasPreview label={b.label} url={b.url} />
                                        ) : (
                                          <span className="text-[11px] text-[#A0AEC0]">Belum diupload mahasiswa</span>
                                        )}
                                        {b.url && (
                                          <div className="flex gap-1 mt-1">
                                            <button type="button" onClick={()=>setBerkasState(p.npm,k,'ok')} aria-label={`Berkas ${b.label} sesuai`} title="Sesuai" className={`flex flex-1 items-center justify-center rounded border py-1.5 ${isOk ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"}`}><Check className="h-4 w-4" /></button>
                                            <button type="button" onClick={()=>setBerkasState(p.npm,k,'x', st.note)} aria-label={`Berkas ${b.label} salah, perlu diperbaiki`} title="Salah — perlu diperbaiki" className={`flex flex-1 items-center justify-center rounded border py-1.5 ${isX ? "bg-amber-500 text-white border-amber-500" : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"}`}><X className="h-4 w-4" /></button>
                                          </div>
                                        )}
                                        {isX && (
                                          <input type="text" placeholder="Catatan per berkas wajib" value={st.note} onChange={e=>setBerkasState(p.npm,k,'x', e.target.value)} className="w-full px-2 py-1 text-[11px] border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-400" />
                                        )}
                                      </div>
                                    )})}
                                  </div>
                                  <div className="flex justify-end pt-2">
                                    <button type="button" onClick={()=>handleSavePerBerkasVerification(p)} className="btn-primary text-xs px-4 py-2">Simpan Verifikasi Per-Berkas</button>
                                  </div>
                                  {isDocumentRejected(p.status) && p.catatanVerifikasiBerkas && (() => {
                                    try { const j = JSON.parse(p.catatanVerifikasiBerkas); if (j && j.perBerkas) return null; } catch {}
                                    return (
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                                      <span className="font-bold">Komentar untuk mahasiswa:</span> {p.catatanVerifikasiBerkas}
                                    </div>
                                    );
                                  })()}
                                  <div className="border-t border-[#E2E8F0] pt-4 text-xs text-[#718096]">
                                    Status berkas: {uploadedCount === 0 ? "Belum mengunggah" : uploadedCount === 6 ? "Lengkap" : `Belum lengkap (${uploadedCount}/6)`}.
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 4: LOGBOOK DIGITAL REALTIME */}
        {activeTab === "logbook" && (
          <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#1A202C]">Catatan Logbook Harian Pengabdian</h3>
                <p className="text-xs text-[#718096]">Logbook aktivitas mahasiswa, dikelompokkan per gampong (Mandiri &amp; Kelompok).</p>
              </div>
              <span className="badge-academic text-xs">{filteredLogbooks.length} Catatan Logbook</span>
            </div>

            {logbookGroups.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#718096] space-y-2">
                <FileText className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                <p>Belum ada catatan logbook yang disimpan ke database.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {logbookGroups.map((group) => (
                  <div key={group.gampong} className="space-y-4">
                    {/* Header Gampong */}
                    <div className="flex items-center gap-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg px-4 py-2.5">
                      <MapPin className="w-4 h-4 text-[#0F5132]" />
                      <h4 className="font-extrabold text-sm text-[#1A202C]">{group.gampong}</h4>
                      <span className="badge-academic text-[10px] ml-auto">
                        {group.mandiri.length + group.kelompok.length} Logbook
                      </span>
                    </div>

                    {/* Sub-grup: Mandiri */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <UserCheck className="w-3.5 h-3.5 text-[#718096]" />
                        <h5 className="text-xs font-extrabold uppercase tracking-wide text-[#718096]">Logbook Mandiri</h5>
                        <span className="text-[10px] font-bold text-[#718096]">({group.mandiri.length})</span>
                      </div>
                      {group.mandiri.length === 0 ? (
                        <p className="text-[11px] text-[#A0AEC0] italic pl-1">Belum ada logbook mandiri dari gampong ini.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {group.mandiri.map((b) => (
                            <div key={b.id} className="academic-card rounded-lg bg-white border border-[#CBD5E1] overflow-hidden flex flex-col justify-between">
                              <div className="p-5 space-y-3">
                                <div className="relative aspect-[16/9] rounded-md overflow-hidden bg-[#F1F5F9] border border-[#E2E8F0]">
                                  {b.foto ? (
                            <Image src={b.foto} alt={b.judul} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[11px] text-[#A0AEC0] font-semibold">Tanpa Foto</div>
                          )}
                                  <div className="absolute top-2 right-2">
                                    <span className="badge-academic text-[10px] bg-white/95 border border-[#CBD5E1]">
                                      {b.status}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-[#718096]">
                                  <span>NPM: <strong>{b.npm}</strong></span>
                                  <span>{b.tanggal}</span>
                                </div>

                                <h4 className="font-extrabold text-base text-[#1A202C] leading-tight">{b.judul}</h4>
                                <div className="text-xs text-[#0F5132] font-semibold">Lokasi: {b.lokasi}</div>
                                <p className="text-xs text-[#4A5568] leading-relaxed">{b.deskripsi}</p>
                              </div>

                              <div className="p-4 bg-[#F8F9FA] border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                                <span className="text-[11px] text-[#0F5132] font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Terdaftar di Server
                                </span>
                                <div className="flex items-center gap-2">
                                  <a href={b.foto} target="_blank" rel="noreferrer" className="text-[#0F5132] font-bold hover:underline flex items-center gap-1">
                                    <span>Lihat Foto HD</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                  <button
                                    onClick={() => b.id && handleDeleteLogbook(b.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200 cursor-pointer"
                                    title="Hapus Logbook"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Sub-grup: Kelompok */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <Users className="w-3.5 h-3.5 text-[#718096]" />
                        <h5 className="text-xs font-extrabold uppercase tracking-wide text-[#718096]">Logbook Kelompok</h5>
                        <span className="text-[10px] font-bold text-[#718096]">({group.kelompok.length})</span>
                      </div>
                      {group.kelompok.length === 0 ? (
                        <p className="text-[11px] text-[#A0AEC0] italic pl-1">Belum ada logbook kelompok dari gampong ini.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {group.kelompok.map((b) => (
                            <div key={b.id} className="academic-card rounded-lg bg-white border border-[#CBD5E1] overflow-hidden flex flex-col justify-between">
                              <div className="p-5 space-y-3">
                                <div className="relative aspect-[16/9] rounded-md overflow-hidden bg-[#F1F5F9] border border-[#E2E8F0]">
                                  {b.foto ? (
                            <Image src={b.foto} alt={b.judul} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[11px] text-[#A0AEC0] font-semibold">Tanpa Foto</div>
                          )}
                                  <div className="absolute top-2 right-2">
                                    <span className="badge-academic text-[10px] bg-white/95 border border-[#CBD5E1]">
                                      {b.status}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-[#718096]">
                                  <span>NPM: <strong>{b.npm}</strong></span>
                                  <span>{b.tanggal}</span>
                                </div>

                                <h4 className="font-extrabold text-base text-[#1A202C] leading-tight">{b.judul}</h4>
                                <div className="text-xs text-[#0F5132] font-semibold">Lokasi: {b.lokasi}</div>
                                <p className="text-xs text-[#4A5568] leading-relaxed">{b.deskripsi}</p>
                              </div>

                              <div className="p-4 bg-[#F8F9FA] border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                                <span className="text-[11px] text-[#0F5132] font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Terdaftar di Server
                                </span>
                                <div className="flex items-center gap-2">
                                  <a href={b.foto} target="_blank" rel="noreferrer" className="text-[#0F5132] font-bold hover:underline flex items-center gap-1">
                                    <span>Lihat Foto HD</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                  <button
                                    onClick={() => b.id && handleDeleteLogbook(b.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200 cursor-pointer"
                                    title="Hapus Logbook"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: BERKAS LAPORAN REALTIME (PDF & WORD) */}
        {activeTab === "laporan" && (
          <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-4 shadow-xs">
            <div className="flex flex-col gap-3 border-b border-[#E2E8F0] pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-base text-[#1A202C]">Berkas Laporan Resmi Mahasiswa</h3>
                  <p className="text-xs text-[#718096]">File dokumen laporan pengabdian (PDF &amp; Word .docx), dikelompokkan per gampong.</p>
                </div>
                <span className="badge-academic text-xs shrink-0">{filteredLaporans.length} Berkas Dokumen</span>
              </div>

            </div>

            {laporanGroups.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#718096] space-y-2">
                <FileCheck className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                <p>Belum ada berkas laporan yang diunggah ke server.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {laporanGroups.map((group) => {
                  const isExpanded = expandedLaporanGampongs.has(group.gampong);
                  return (
                  <div key={group.gampong} className="space-y-2">
                    {/* Header Gampong */}
                    <div className="flex items-center gap-2 bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg px-4 py-2.5">
                      <MapPin className="w-4 h-4 text-[#0F5132]" />
                      <h4 className="font-extrabold text-sm text-[#1A202C]">{group.gampong}</h4>
                      <span className="badge-academic text-[10px] ml-auto">{group.items.length} Berkas</span>
                      <button
                        type="button"
                        onClick={() => toggleLaporanGampong(group.gampong)}
                        className="btn-secondary flex items-center gap-1.5 px-2.5 py-1 text-[11px]"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {isExpanded ? "Tutup" : "Buka"}
                      </button>
                    </div>

                    {isExpanded && <div className="divide-y divide-[#E2E8F0] border-b border-[#E2E8F0]">
                      {group.items.map((lap) => {
                        const isWord = lap.namaFile?.endsWith(".doc") || lap.namaFile?.endsWith(".docx") || lap.fileType?.includes("word");
                        return (
                          <div key={lap.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${isWord ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                                <FileText className="w-5 h-5" />
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-extrabold text-sm text-[#1A202C]">{lap.jenis}</h5>
                                  <span className="badge-academic text-[10px]">{lap.status}</span>
                                </div>
                                <div className="text-xs text-[#718096] flex items-center gap-3 flex-wrap">
                                  <span>NPM: <strong>{lap.npm}</strong></span>
                                  <span>•</span>
                                  <span>Nama File: <strong>{lap.namaFile}</strong></span>
                                  <span>•</span>
                                  <span>Ukuran: {formatFileSize(lap.fileSize)}</span>
                                  <span>•</span>
                                  <span>Diunggah: {lap.tanggalUpload}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              <a
                                href={lap.fileUrl}
                                target="_blank"
                                download
                                rel="noreferrer"
                                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                              >
                                <Download className="w-3.5 h-3.5 text-[#0F5132]" />
                                <span>Unduh Dokumen</span>
                              </a>
                              <button
                                onClick={() => lap.id && handleDeleteLaporan(lap.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200 cursor-pointer"
                                title="Hapus Berkas Laporan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MODAL 4: TAMBAH MAHASISWA BARU */}
        {isStudentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] max-w-lg w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h3 className="text-base font-bold text-[#1A202C] flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#0F5132]" />
                  Tambah Mahasiswa KKM Baru
                </h3>
                <button onClick={() => setIsStudentModalOpen(false)} className="text-xs text-[#718096] hover:text-[#1A202C] cursor-pointer">✕ Tutup</button>
              </div>



              <form onSubmit={handleAddStudent} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Nama Mahasiswa *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Rahmat Hidayat..."
                      value={newStudentForm.nama}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, nama: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">NPM *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 210610015..."
                      value={newStudentForm.npm}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, npm: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Password Default *</label>
                    <input
                      type="password"
                      required
                      value={newStudentForm.password}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, password: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">IPK Awal *</label>
                    <input
                      type="text"
                      required
                      value={newStudentForm.ipk}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, ipk: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Fakultas *</label>
                    <input
                      type="text"
                      required
                      value={newStudentForm.fakultas}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, fakultas: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Program Studi *</label>
                    <input
                      type="text"
                      required
                      value={newStudentForm.prodi}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, prodi: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Skema Program KKM *</label>
                    <select
                      value={newStudentForm.program}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, program: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs bg-white"
                    >
                      <option value="KKM Reguler">KKM Reguler</option>
                      <option value="KKM Internasional">KKM Internasional</option>
                      <option value="KKM Non-Reguler">KKM Non-Reguler / MBKM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Kecamatan Penempatan *</label>
                    <input
                      type="text"
                      required
                      value={newStudentForm.kecamatan}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, kecamatan: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Angkatan</label>
                    <input
                      type="text"
                      placeholder="Contoh: XXXV"
                      value={newStudentForm.angkatan}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, angkatan: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Lokasi Penugasan</label>
                    <input
                      type="text"
                      placeholder="Contoh: Gampong Meunasah Blang"
                      value={newStudentForm.lokasi}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, lokasi: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Nama Gampong / Lokasi KKM</label>
                    <select
                      value={newStudentForm.gampong}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matchingGampong = gampongs.find(g => g.nama === val);
                        setNewStudentForm({
                          ...newStudentForm,
                          gampong: val,
                          lokasi: val || newStudentForm.lokasi,
                          dpl: matchingGampong?.dpl || newStudentForm.dpl,
                        });
                      }}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs bg-white"
                    >
                      <option value="">-- Pilih Gampong --</option>
                      {gampongs.map((g) => (
                        <option key={g.id || g.nama} value={g.nama}>
                          {g.nama} ({g.kecamatan} - Posko: {g.posko})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">DPL Pembimbing</label>
                    <select
                      value={newStudentForm.dpl}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, dpl: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs bg-white"
                    >
                      <option value="">-- Pilih DPL --</option>
                      {dpls.map((d) => (
                        <option key={d.id || d.nidn} value={d.nama}>
                          {d.nama} ({d.skema} - NIDN: {d.nidn})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsStudentModalOpen(false)} className="btn-secondary w-1/2 py-2 text-xs justify-center cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" disabled={isSubmittingStudent} className="btn-primary w-1/2 py-2 text-xs justify-center cursor-pointer font-bold">
                    {isSubmittingStudent ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : "Tambah Mahasiswa"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 5: EDIT MAHASISWA & PENEMPATAN GAMPONG/DPL */}
        {isEditStudentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] max-w-lg w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h3 className="text-base font-bold text-[#1A202C] flex items-center gap-2">
                  <Edit className="w-4 h-4 text-[#0F5132]" />
                  Edit &amp; Tempatkan Mahasiswa di Gampong
                </h3>
                <button onClick={() => setIsEditStudentModalOpen(false)} className="text-xs text-[#718096] hover:text-[#1A202C] cursor-pointer">✕ Tutup</button>
              </div>

              <form onSubmit={handleEditStudent} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Nama Mahasiswa *</label>
                  <input
                    type="text"
                    required
                    value={editStudentForm.nama}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, nama: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">NPM *</label>
                    <input
                      type="text"
                      disabled
                      value={editStudentForm.npm}
                      className="w-full px-3 py-2 rounded-md bg-gray-100 border border-gray-300 text-xs text-[#718096] cursor-not-allowed font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">IPK *</label>
                    <input
                      type="text"
                      required
                      value={editStudentForm.ipk}
                      onChange={(e) => setEditStudentForm({ ...editStudentForm, ipk: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Fakultas *</label>
                    <input
                      type="text"
                      required
                      value={editStudentForm.fakultas}
                      onChange={(e) => setEditStudentForm({ ...editStudentForm, fakultas: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Program Studi *</label>
                    <input
                      type="text"
                      required
                      value={editStudentForm.prodi}
                      onChange={(e) => setEditStudentForm({ ...editStudentForm, prodi: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Skema Program KKM *</label>
                    <select
                      value={editStudentForm.program}
                      onChange={(e) => setEditStudentForm({ ...editStudentForm, program: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs bg-white"
                    >
                      <option value="KKM Reguler">KKM Reguler</option>
                      <option value="KKM Internasional">KKM Internasional</option>
                      <option value="KKM Non-Reguler">KKM Non-Reguler / MBKM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Kecamatan Penempatan *</label>
                    <input
                      type="text"
                      required
                      value={editStudentForm.kecamatan}
                      onChange={(e) => setEditStudentForm({ ...editStudentForm, kecamatan: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Tempatkan di Gampong</label>
                    <select
                      value={editStudentForm.gampong}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matchingGampong = gampongs.find(g => g.nama === val);
                        setEditStudentForm({
                          ...editStudentForm,
                          gampong: val,
                          lokasi: val || editStudentForm.lokasi,
                          dpl: matchingGampong?.dpl || editStudentForm.dpl,
                        });
                      }}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs bg-white"
                    >
                      <option value="">-- Pilih Gampong --</option>
                      {gampongs.map((g) => (
                        <option key={g.id || g.nama} value={g.nama}>
                          {g.nama} ({g.kecamatan} - Posko: {g.posko})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">DPL Pembimbing Lapangan</label>
                    <select
                      value={editStudentForm.dpl}
                      onChange={(e) => setEditStudentForm({ ...editStudentForm, dpl: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs bg-white"
                    >
                      <option value="">-- Pilih DPL --</option>
                      {dpls.map((d) => (
                        <option key={d.id || d.nidn} value={d.nama}>
                          {d.nama} ({d.skema} - NIDN: {d.nidn})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsEditStudentModalOpen(false)} className="btn-secondary w-1/2 py-2 text-xs justify-center cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" disabled={isSubmittingStudent} className="btn-primary w-1/2 py-2 text-xs justify-center cursor-pointer font-bold">
                    {isSubmittingStudent ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Global Loading overlay for Excel Importing */}
        {isImportingExcel && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs text-white space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-white" />
            <h3 className="font-bold text-lg">Memproses File Excel...</h3>
            <p className="text-xs text-[#CBD5E1]">Sedang mem-parsing dan menyimpan data baru ke database...</p>
          </div>
        )}

        {/* TAB 6: KELOLA BERITA & PENGUMUMAN */}
        {activeTab === "berita" && (
          <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#1A202C]">Manajemen Berita &amp; Pengumuman</h3>
                <p className="text-xs text-[#718096]">Admin dapat menambah dan menghapus berita yang ditampilkan di halaman publik portal KKM.</p>
              </div>

              <button
                onClick={() => setIsBeritaModalOpen(true)}
                className="btn-primary text-xs py-2 px-4 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Tambah Berita Baru</span>
              </button>
            </div>

            {filteredBerita.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#718096] space-y-2">
                <Newspaper className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                <p>Belum ada berita tersimpan di database.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0] text-[#718096] uppercase font-bold text-[10px]">
                      <th className="py-3 px-4">Judul Berita</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Penulis</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filteredBerita.map((b) => (
                      <tr key={b.id} className="hover:bg-[#F8F9FA]/60">
                        <td className="py-3 px-4 font-bold text-[#1A202C]">{b.judul}</td>
                        <td className="py-3 px-4">
                          <span className="badge-academic text-[10px] bg-[#E6F4EA] text-[#0F5132] border-[#B7E1CD]">
                            {b.kategori}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#4A5568]">{b.tanggal}</td>
                        <td className="py-3 px-4 text-[#2D3748]">{b.penulis}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => b.id && handleDeleteBerita(b.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200 cursor-pointer"
                            title="Hapus Berita"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: KELOLA DOKUMEN UNDUHAN */}
        {activeTab === "dokumen" && (
          <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#1A202C]">Manajemen Dokumen Unduhan LPPM</h3>
                <p className="text-xs text-[#718096]">Admin dapat menambah dan menghapus dokumen (PDF/DOCX) yang ditampilkan di Pusat Unduhan halaman publik portal KKM.</p>
              </div>

              <button
                onClick={() => setIsDokumenModalOpen(true)}
                className="btn-primary text-xs py-2 px-4 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Tambah Dokumen Baru</span>
              </button>
            </div>

            {dokumens.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#718096] space-y-2">
                <FileText className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                <p>Belum ada dokumen tersimpan di database. Halaman publik akan menampilkan daftar dokumen default.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0] text-[#718096] uppercase font-bold text-[10px]">
                      <th className="py-3 px-4">Judul Dokumen</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Format</th>
                      <th className="py-3 px-4">Ukuran</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {dokumens.map((d) => (
                      <tr key={d.id} className="hover:bg-[#F8F9FA]/60">
                        <td className="py-3 px-4 font-bold text-[#1A202C]">
                          {d.judul}
                          {d.deskripsi && <span className="block font-normal text-[10px] text-[#718096] mt-0.5">{d.deskripsi}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="badge-academic text-[10px] bg-[#E6F4EA] text-[#0F5132] border-[#B7E1CD]">
                            {d.kategori}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[#2D3748]">{d.format}</td>
                        <td className="py-3 px-4 font-mono text-[#4A5568]">
                          {d.ukuran >= 1024 * 1024 ? `${(d.ukuran / (1024 * 1024)).toFixed(1)} MB` : d.ukuran > 0 ? `${Math.max(1, Math.round(d.ukuran / 1024))} KB` : "-"}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <a
                            href={d.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block p-1.5 text-[#0F5132] hover:bg-green-50 rounded border border-green-200 cursor-pointer mr-1"
                            title="Lihat Berkas"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => d.id && handleDeleteDokumen(d.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200 cursor-pointer"
                            title="Hapus Dokumen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: KELOLA JADWAL TIMELINE */}
        {activeTab === "jadwal" && (
          <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#1A202C]">Manajemen Jadwal / Timeline KKM</h3>
                <p className="text-xs text-[#718096]">Admin dapat menambah dan menghapus tahapan agenda yang ditampilkan di bagian Timeline halaman publik portal KKM.</p>
              </div>

              <button
                onClick={() => setIsJadwalModalOpen(true)}
                className="btn-primary text-xs py-2 px-4 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Tambah Tahapan Baru</span>
              </button>
            </div>

            {timelines.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#718096] space-y-2">
                <CalendarClock className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                <p>Belum ada tahapan tersimpan di database. Halaman publik akan menampilkan jadwal default.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0] text-[#718096] uppercase font-bold text-[10px]">
                      <th className="py-3 px-4">Tahap</th>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Kegiatan</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {timelines.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-[#F8F9FA]/60">
                        <td className="py-3 px-4 font-mono font-bold text-[#0F5132]">Tahap {String(idx + 1).padStart(2, "0")}</td>
                        <td className="py-3 px-4 font-bold text-[#2D3748] whitespace-nowrap">{t.tanggal}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#1A202C]">{t.judul}</span>
                          {t.deskripsi && <span className="block font-normal text-[10px] text-[#718096] mt-0.5">{t.deskripsi}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              t.status === "Berlangsung"
                                ? "bg-[#E6F4EA] text-[#0F5132] border-[#B7E1CD]"
                                : t.status === "Selesai"
                                  ? "bg-[#E2E8F0] text-[#4A5568] border-[#CBD5E1]"
                                  : "bg-[#F1F5F9] text-[#718096] border-[#CBD5E1]"
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => t.id && handleDeleteJadwal(t.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200 cursor-pointer"
                            title="Hapus Tahapan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: KELOLA PENGUMUMAN HERO */}
        {activeTab === "pengumuman" && (
          <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#1A202C]">Manajemen Pengumuman Hero Section</h3>
                <p className="text-xs text-[#718096]">
                  Atur teks &quot;INFORMASI RESMI&quot; dan pesan pendaftaran yang ditampilkan di bagian hero halaman utama portal KKM.
                  Hanya pengumuman yang aktif (isActive=true) yang akan ditampilkan.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingAnnouncement(null);
                  setNewAnnouncementForm({
                    label: "INFORMASI RESMI",
                    message: "Pendaftaran KKM Universitas Almuslim Angkatan XXXV Tahun 2026 Resmi Dibuka.",
                    deadline: "2026-07-25",
                    isActive: true,
                  });
                  setIsAnnouncementModalOpen(true);
                }}
                className="btn-primary text-xs py-2 px-4 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Tambah Pengumuman</span>
              </button>
            </div>

            {announcements.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#718096] space-y-2">
                <FileText className="w-10 h-10 text-[#CBD5E1] mx-auto" />
                <p>Belum ada pengumuman. Tambah pengumuman baru untuk menampilkan banner di halaman utama.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FA] border-b border-[#E2E8F0] text-[#718096] uppercase font-bold text-[10px]">
                      <th className="py-3 px-4">Label</th>
                      <th className="py-3 px-4">Pesan</th>
                      <th className="py-3 px-4">Batas Waktu</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {announcements.map((a) => (
                      <tr key={a.id} className="hover:bg-[#F8F9FA]/60">
                        <td className="py-3 px-4 font-bold text-[#1A202C]">{a.label}</td>
                        <td className="py-3 px-4 max-w-xs truncate text-[#2D3748]">{a.message}</td>
                        <td className="py-3 px-4 font-mono text-[#4A5568] whitespace-nowrap">{a.deadline || "-"}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              a.isActive
                                ? "bg-[#E6F4EA] text-[#0F5132] border-[#B7E1CD]"
                                : "bg-[#E2E8F0] text-[#4A5568] border-[#CBD5E1]"
                            }`}
                          >
                            {a.isActive ? "Aktif (Ditampilkan)" : "Nonaktif"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => openEditAnnouncement(a)}
                            className="p-1.5 text-[#0F5132] hover:bg-[#E6F4EA] rounded border border-[#B7E1CD] cursor-pointer"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => a.id && handleDeleteAnnouncement(a.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded border border-red-200 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MODAL 1: TAMBAH GAMPONG / POSKO KKM */}
        {isGampongModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] max-w-lg w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h3 className="text-base font-bold text-[#1A202C] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#0F5132]" />
                  {editingGampongId ? "Edit Gampong & Posko KKM" : "Tambah Gampong & Posko KKM"}
                </h3>
                <button onClick={() => setIsGampongModalOpen(false)} className="text-xs text-[#718096] hover:text-[#1A202C]">✕ Tutup</button>
              </div>

              {/* Opsi Cepat: Import Excel Gampong & Posko */}
              <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1A202C] flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#0F5132]" />
                    Import Data Massal via File Excel
                  </span>
                </div>
                <p className="text-[11px] text-[#718096]">
                  Upload file Excel (.xlsx / .xls) untuk menambahkan data Gampong, Posko, dan DPL sekaligus secara otomatis.
                </p>
                <div>
                  <label className="btn-secondary w-full py-1.5 text-xs justify-center cursor-pointer flex items-center gap-1.5 shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-[#0F5132]" />
                    <span>{isUploadingGampongExcel ? "Memproses File Excel..." : "Pilih File Excel Gampong & Posko"}</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={(e) => {
                        handleGampongExcelUpload(e);
                        setIsGampongModalOpen(false);
                      }}
                      className="hidden"
                      disabled={isUploadingGampongExcel}
                    />
                  </label>
                </div>
              </div>

              <div className="relative flex items-center justify-center my-1">
                <div className="border-t border-[#E2E8F0] w-full" />
                <span className="bg-white px-2 text-[10px] uppercase font-bold text-[#A0AEC0] absolute">Atau Input Manual</span>
              </div>

              <form onSubmit={handleSaveGampong} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Skema Program KKM *</label>
                  <select
                    value={newGampongForm.skema}
                    onChange={(e) => setNewGampongForm({ ...newGampongForm, skema: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs bg-white"
                  >
                    <option value="KKM Reguler">KKM Reguler</option>
                    <option value="KKM Internasional">KKM Internasional</option>
                    <option value="KKM Non-Reguler">KKM Non-Reguler / MBKM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Nama Kampung / Lokasi Target *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Gampong Meunasah Blang / Selangor Malaysia..."
                    value={newGampongForm.nama}
                    onChange={(e) => setNewGampongForm({ ...newGampongForm, nama: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Angkatan</label>
                    <input
                      type="text"
                      placeholder="Contoh: XXXV"
                      value={newGampongForm.angkatan}
                      onChange={(e) => setNewGampongForm({ ...newGampongForm, angkatan: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Lokasi Penugasan</label>
                    <input
                      type="text"
                      placeholder="Contoh: Gampong Meunasah Blang"
                      value={newGampongForm.lokasi}
                      onChange={(e) => setNewGampongForm({ ...newGampongForm, lokasi: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Pilih DPL Pembimbing Lapangan *</label>
                  <select
                    value={newGampongForm.dpl}
                    onChange={(e) => setNewGampongForm({ ...newGampongForm, dpl: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs bg-white font-medium"
                  >
                    <option value="">-- Pilih DPL Pembimbing --</option>
                    {dpls.map((d) => (
                      <option key={d.id || d.nidn} value={d.nama}>
                        {d.nama} ({d.skema} - NIDN: {d.nidn})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Kabupaten *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Bireuen"
                      value={newGampongForm.kabupaten}
                      onChange={(e) => setNewGampongForm({ ...newGampongForm, kabupaten: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Kecamatan / Daerah *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Peusangan / Luar Negeri..."
                      value={newGampongForm.kecamatan}
                      onChange={(e) => setNewGampongForm({ ...newGampongForm, kecamatan: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Nama Posko *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Posko 04 KKM..."
                      value={newGampongForm.posko}
                      onChange={(e) => setNewGampongForm({ ...newGampongForm, posko: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Keuchik / Penanggung Jawab</label>
                    <input
                      type="text"
                      placeholder="Contoh: Tgk. H. Ismail"
                      value={newGampongForm.keuchik}
                      onChange={(e) => setNewGampongForm({ ...newGampongForm, keuchik: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Kontak Person / WA</label>
                    <input
                      type="text"
                      placeholder="Contoh: 0852-7711-2244"
                      value={newGampongForm.kontakKeuchik}
                      onChange={(e) => setNewGampongForm({ ...newGampongForm, kontakKeuchik: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Kuota Maksimal Mahasiswa</label>
                  <input
                    type="number"
                    value={newGampongForm.kuota}
                    onChange={(e) => setNewGampongForm({ ...newGampongForm, kuota: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsGampongModalOpen(false)} className="btn-secondary w-1/2 py-2 text-xs justify-center cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" disabled={isSubmittingGampong} className="btn-primary w-1/2 py-2 text-xs justify-center cursor-pointer font-bold">
                    {isSubmittingGampong ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : editingGampongId ? "Simpan Perubahan" : "Simpan Program"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: BUAT AKUN DPL BARU */}
        {isDplModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] max-w-lg w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h3 className="text-base font-bold text-[#1A202C] flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#0F5132]" />
                  {editingDplId ? "Edit Akun Dosen Pembimbing Lapangan (DPL)" : "Buat Akun Dosen Pembimbing Lapangan (DPL)"}
                </h3>
                <button onClick={() => setIsDplModalOpen(false)} className="text-xs text-[#718096] hover:text-[#1A202C]">✕ Tutup</button>
              </div>

              {/* Opsi Cepat: Import Excel DPL */}
              <div className="p-3 bg-[#F8F9FA] rounded-lg border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1A202C] flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#0F5132]" />
                    Import Massal Akun DPL via Excel
                  </span>
                </div>
                <p className="text-[11px] text-[#718096]">
                  Upload file Excel (.xlsx / .xls) berisi daftar DPL (Nama, NIDN, Fakultas, Skema, Kecamatan).
                </p>
                <div>
                  <label className="btn-secondary w-full py-1.5 text-xs justify-center cursor-pointer flex items-center gap-1.5 shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-[#0F5132]" />
                    <span>{isImportingExcel ? "Memproses File Excel..." : "Pilih File Excel DPL"}</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={(e) => {
                        handleImportDplsExcel(e);
                        setIsDplModalOpen(false);
                      }}
                      className="hidden"
                      disabled={isImportingExcel}
                    />
                  </label>
                </div>
              </div>

              <div className="relative flex items-center justify-center my-1">
                <div className="border-t border-[#E2E8F0] w-full" />
                <span className="bg-white px-2 text-[10px] uppercase font-bold text-[#A0AEC0] absolute">Atau Buat Akun Manual</span>
              </div>

              <form onSubmit={handleSaveDpl} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Nama Lengkap &amp; Gelar DPL *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Dr. Saifuddin, M.Pd."
                    value={newDplForm.nama}
                    onChange={(e) => setNewDplForm({ ...newDplForm, nama: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">NIDN / Username Login *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 0012057801"
                      value={newDplForm.nidn}
                      onChange={(e) => setNewDplForm({ ...newDplForm, nidn: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">{editingDplId ? "Password Baru (opsional)" : "Password Akun *"}</label>
                    <input
                      type="password"
                      required={!editingDplId}
                      placeholder={editingDplId ? "Kosongkan jika tidak diubah" : "Default: dpl123"}
                      value={newDplForm.password}
                      onChange={(e) => setNewDplForm({ ...newDplForm, password: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Fakultas / Program Studi *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Fakultas Ilmu Komputer (FIKOM)"
                    value={newDplForm.fakultas}
                    onChange={(e) => setNewDplForm({ ...newDplForm, fakultas: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Kategori Skema KKM *</label>
                    <select
                      value={newDplForm.skema}
                      onChange={(e) => setNewDplForm({ ...newDplForm, skema: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs bg-white"
                    >
                      <option value="KKM Reguler">KKM Reguler</option>
                      <option value="KKM Internasional">KKM Internasional</option>
                      <option value="KKM Non-Reguler">KKM Non-Reguler / MBKM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Wilayah Kecamatan / Binaan</label>
                    <input
                      type="text"
                      placeholder="Contoh: Peusangan"
                      value={newDplForm.kecamatan}
                      onChange={(e) => setNewDplForm({ ...newDplForm, kecamatan: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsDplModalOpen(false)} className="btn-secondary w-1/2 py-2 text-xs justify-center cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" disabled={isSubmittingDpl} className="btn-primary w-1/2 py-2 text-xs justify-center cursor-pointer font-bold">
                    {isSubmittingDpl ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : editingDplId ? "Simpan Perubahan" : "Buat Akun DPL"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: TAMBAH BERITA BARU */}
        {isBeritaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] max-w-lg w-full shadow-2xl relative space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h3 className="text-base font-bold text-[#1A202C] flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-[#0F5132]" />
                  Tambah Berita / Pengumuman Baru
                </h3>
                <button onClick={() => setIsBeritaModalOpen(false)} className="text-xs text-[#718096] hover:text-[#1A202C]">✕ Tutup</button>
              </div>

              <form onSubmit={handleAddBerita} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Judul Berita *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Rektor Resmikan Pembekalan KKM Angkatan XXXV"
                    value={newBeritaForm.judul}
                    onChange={(e) => setNewBeritaForm({ ...newBeritaForm, judul: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Kategori *</label>
                    <select
                      value={newBeritaForm.kategori}
                      onChange={(e) => setNewBeritaForm({ ...newBeritaForm, kategori: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs bg-white"
                    >
                      <option value="Berita Kampus">Berita Kampus</option>
                      <option value="Pengabdian Desa">Pengabdian Desa</option>
                      <option value="Teknologi & Inovasi">Teknologi &amp; Inovasi</option>
                      <option value="Pengumuman Resmi">Pengumuman Resmi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Tanggal *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 04 Juli 2026"
                      value={newBeritaForm.tanggal}
                      onChange={(e) => setNewBeritaForm({ ...newBeritaForm, tanggal: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Penulis</label>
                  <input
                    type="text"
                    placeholder="Humas LPPM UMuslim"
                    value={newBeritaForm.penulis}
                    onChange={(e) => setNewBeritaForm({ ...newBeritaForm, penulis: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                    Upload Foto Berita * <span className="text-[11px] text-[#718096] font-normal">(Maksimal 1 MB, Format JPG/PNG/WEBP)</span>
                  </label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleFotoChange}
                    className="w-full px-3 py-1.5 text-xs border border-[#CBD5E1] rounded-md bg-white file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#E6F4EA] file:text-[#0F5132] hover:file:bg-[#d4edda] cursor-pointer"
                  />
                  {isUploadingFoto && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#0F5132] mt-1.5 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F5132]" />
                      <span>Mengunggah berkas foto...</span>
                    </div>
                  )}
                  {newBeritaForm.gambar && !isUploadingFoto && (
                    <div className="mt-2 flex items-center gap-2.5 p-2 rounded-md bg-[#F8F9FA] border border-[#E2E8F0]">
                      <div className="relative w-16 h-12 rounded overflow-hidden border border-[#CBD5E1] shrink-0">
                        <Image src={newBeritaForm.gambar} alt="Preview Foto Berita" fill className="object-cover" />
                      </div>
                      <div className="text-[11px] text-[#0F5132] font-semibold">
                        ✓ Berkas foto berhasil diunggah!
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Konten / Isi Berita *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Tulis isi konten berita di sini..."
                    value={newBeritaForm.konten}
                    onChange={(e) => setNewBeritaForm({ ...newBeritaForm, konten: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsBeritaModalOpen(false)} className="btn-secondary w-1/2 py-2 text-xs justify-center cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" disabled={isSubmittingBerita} className="btn-primary w-1/2 py-2 text-xs justify-center cursor-pointer font-bold">
                    {isSubmittingBerita ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : "Publikasikan Berita"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: TAMBAH DOKUMEN UNDUHAN */}
        {isDokumenModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] max-w-lg w-full shadow-2xl relative space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h3 className="text-base font-bold text-[#1A202C] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0F5132]" />
                  Tambah Dokumen Unduhan Baru
                </h3>
                <button onClick={() => setIsDokumenModalOpen(false)} className="text-xs text-[#718096] hover:text-[#1A202C]">✕ Tutup</button>
              </div>

              <form onSubmit={handleAddDokumen} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Judul Dokumen *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Buku Pedoman KKM Universitas Almuslim TA. 2026/2027"
                    value={newDokumenForm.judul}
                    onChange={(e) => setNewDokumenForm({ ...newDokumenForm, judul: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Kategori *</label>
                  <select
                    value={newDokumenForm.kategori}
                    onChange={(e) => setNewDokumenForm({ ...newDokumenForm, kategori: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs bg-white"
                  >
                    <option value="Pedoman Resmi">Pedoman Resmi</option>
                    <option value="Format Laporan">Format Laporan</option>
                    <option value="Instrumen Evaluasi">Instrumen Evaluasi</option>
                    <option value="Administrasi Desa">Administrasi Desa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Deskripsi</label>
                  <textarea
                    rows={3}
                    placeholder="Contoh: Petunjuk teknis pelaksanaan KKM, aturan tata tertib posko, serta bobot penilaian."
                    value={newDokumenForm.deskripsi}
                    onChange={(e) => setNewDokumenForm({ ...newDokumenForm, deskripsi: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                    Upload Berkas Dokumen * <span className="text-[11px] text-[#718096] font-normal">(Maksimal 10 MB, Format PDF/DOCX)</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleDokumenFileChange}
                    className="w-full px-3 py-1.5 text-xs border border-[#CBD5E1] rounded-md bg-white file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#E6F4EA] file:text-[#0F5132] hover:file:bg-[#d4edda] cursor-pointer"
                  />
                  {isUploadingDokumen && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#0F5132] mt-1.5 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F5132]" />
                      <span>Mengunggah berkas dokumen...</span>
                    </div>
                  )}
                  {newDokumenForm.fileUrl && !isUploadingDokumen && (
                    <div className="mt-2 flex items-center gap-2.5 p-2 rounded-md bg-[#F8F9FA] border border-[#E2E8F0]">
                      <FileText className="w-4 h-4 text-[#0F5132] shrink-0" />
                      <div className="text-[11px] text-[#0F5132] font-semibold truncate">
                        ✓ {newDokumenForm.fileName || "Berkas"} berhasil diunggah ({newDokumenForm.format})
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsDokumenModalOpen(false)} className="btn-secondary w-1/2 py-2 text-xs justify-center cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" disabled={isSubmittingDokumen || isUploadingDokumen} className="btn-primary w-1/2 py-2 text-xs justify-center cursor-pointer font-bold disabled:opacity-50">
                    {isSubmittingDokumen ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : "Simpan Dokumen"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: TAMBAH JADWAL TIMELINE */}
        {isJadwalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] max-w-lg w-full shadow-2xl relative space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h3 className="text-base font-bold text-[#1A202C] flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-[#0F5132]" />
                  Tambah Tahapan Timeline Baru
                </h3>
                <button onClick={() => setIsJadwalModalOpen(false)} className="text-xs text-[#718096] hover:text-[#1A202C]">✕ Tutup</button>
              </div>

              <form onSubmit={handleAddJadwal} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Judul Kegiatan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pembekalan KKM & Pembagian Kelompok / Posko"
                    value={newJadwalForm.judul}
                    onChange={(e) => setNewJadwalForm({ ...newJadwalForm, judul: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Tanggal *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 1 - 25 Juli 2026"
                      value={newJadwalForm.tanggal}
                      onChange={(e) => setNewJadwalForm({ ...newJadwalForm, tanggal: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">Status</label>
                    <select
                      value={newJadwalForm.status}
                      onChange={(e) => setNewJadwalForm({ ...newJadwalForm, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs bg-white"
                    >
                      <option value="Akan Datang">Akan Datang</option>
                      <option value="Berlangsung">Berlangsung</option>
                      <option value="Selesai">Selesai</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Deskripsi</label>
                  <textarea
                    rows={3}
                    placeholder="Contoh: Pengisian formulir pendaftaran KKM secara online, verifikasi IPK & SKS oleh LPPM."
                    value={newJadwalForm.deskripsi}
                    onChange={(e) => setNewJadwalForm({ ...newJadwalForm, deskripsi: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsJadwalModalOpen(false)} className="btn-secondary w-1/2 py-2 text-xs justify-center cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" disabled={isSubmittingJadwal} className="btn-primary w-1/2 py-2 text-xs justify-center cursor-pointer font-bold disabled:opacity-50">
                    {isSubmittingJadwal ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : "Simpan Tahapan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: TAMBAH/EDIT PENGUMUMAN HERO */}
        {isAnnouncementModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] max-w-lg w-full shadow-2xl relative space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h3 className="text-base font-bold text-[#1A202C] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0F5132]" />
                  {editingAnnouncement ? "Edit Pengumuman" : "Tambah Pengumuman Baru"}
                </h3>
                <button onClick={() => { setIsAnnouncementModalOpen(false); setEditingAnnouncement(null); }} className="text-xs text-[#718096] hover:text-[#1A202C]">✕ Tutup</button>
              </div>

              <form onSubmit={editingAnnouncement ? handleUpdateAnnouncement : handleAddAnnouncement} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Label *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: INFORMASI RESMI"
                    value={newAnnouncementForm.label}
                    onChange={(e) => setNewAnnouncementForm({ ...newAnnouncementForm, label: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Pesan *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Contoh: Pendaftaran KKM Universitas Almuslim Angkatan XXXV Tahun 2026 Resmi Dibuka."
                    value={newAnnouncementForm.message}
                    onChange={(e) => setNewAnnouncementForm({ ...newAnnouncementForm, message: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">Batas Waktu (Opsional)</label>
                  <input
                    type="date"
                    value={newAnnouncementForm.deadline || ""}
                    onChange={(e) => setNewAnnouncementForm({ ...newAnnouncementForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                  <p className="text-[10px] text-[#718096] mt-1">Format: YYYY-MM-DD. Contoh: 2026-07-25</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="announcement-active"
                    checked={newAnnouncementForm.isActive}
                    onChange={(e) => setNewAnnouncementForm({ ...newAnnouncementForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-[#CBD5E1] text-[#0F5132] focus:ring-[#0F5132]"
                  />
                  <label htmlFor="announcement-active" className="text-xs font-medium text-[#2D3748] cursor-pointer">
                    Aktifkan pengumuman ini (hanya satu yang aktif sekaligus)
                  </label>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => { setIsAnnouncementModalOpen(false); setEditingAnnouncement(null); }} className="btn-secondary w-1/2 py-2 text-xs justify-center cursor-pointer">
                    Batal
                  </button>
                  <button type="submit" disabled={isSubmittingAnnouncement} className="btn-primary w-1/2 py-2 text-xs justify-center cursor-pointer font-bold disabled:opacity-50">
                    {isSubmittingAnnouncement ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : (editingAnnouncement ? "Simpan Perubahan" : "Simpan Pengumuman")}
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

export default function AdminPortal() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F9FA] text-[#1A202C] flex items-center justify-center">Memuat Portal Admin LPPM...</div>}>
      <AdminContent />
    </Suspense>
  );
}
