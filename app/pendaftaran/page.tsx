"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  LogOut,
  Check,
  User,
  MapPin,
  Calendar,
  Hash,
  Building,
  BookOpen,
  Award,
  Layers,
  Heart,
  Home,
  Phone,
  Mail,
  GraduationCap,
} from "lucide-react";
import { getErrorMessage } from "@/lib/client-error";

const fakultasProdiMap: Record<string, string[]> = {
  "Fakultas Pertanian (FP)": [
    "S1 Agroteknologi",
    "S1 Peternakan",
    "S1 Agribisnis",
    "S1 Akuakultur",
    "S1 Kehutanan",
    "S1 Teknologi Industri Pertanian",
  ],
  "Fakultas Keguruan dan Ilmu Pendidikan (FKIP)": [
    "S1 Pendidikan Matematika",
    "S1 Pendidikan Bahasa Inggris",
    "S1 Pendidikan Biologi",
    "S1 Pendidikan Ekonomi",
    "S1 Pendidikan Bahasa Indonesia",
    "S1 Pendidikan Fisika",
    "S1 Pendidikan Geografi",
    "S1 Pendidikan Guru Sekolah Dasar (PGSD)",
    "S1 Pendidikan Guru Pendidikan Anak Usia Dini (PG-PAUD)",
  ],
  "Fakultas Teknik (FT)": [
    "S1 Teknik Sipil",
    "S1 Arsitektur",
    "S1 Ilmu Lingkungan",
  ],
  "Fakultas Ilmu Sosial dan Ilmu Politik (FISIP)": [
    "S1 Administrasi Publik",
    "S1 Administrasi Bisnis",
    "S1 Ilmu Hubungan Internasional",
  ],
  "Fakultas Ekonomi (FE)": [
    "S1 Ekonomi Pembangunan",
    "S1 Manajemen Ritel",
  ],
  "Fakultas Ilmu Komputer (FIKOM)": [
    "S1 Informatika",
    "S1 Informatika Medis",
  ],
};

const fakultasList = Object.keys(fakultasProdiMap);

interface UserAccount {
  nama: string;
  npm: string;
}

function UnggahBerkasContent() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [hasExistingBiodata, setHasExistingBiodata] = useState(false);

  // Biodata Form States
  const [form, setForm] = useState({
    nama: "",
    tempatLahir: "",
    tanggalLahir: "",
    nim: "",
    fakultas: "Fakultas Ilmu Komputer (FIKOM)",
    prodi: "",
    ipk: "",
    sksLulus: "",
    sksBelumLulus: "",
    kelasKuliah: "Reguler",
    statusPerkawinan: "Belum kawin",
    alamatSekarang: "",
    noTelepon: "",
    hpOrtuWali: "",
    email: "",
    kkmSemester: "Ganjil",
  });

  useEffect(() => {
    fetch("/api/auth/session?role=mahasiswa")
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.session || data.session.role !== "mahasiswa") {
          router.push("/daftar");
          return;
        }
        const s = data.session;
        setCurrentUser({ nama: s.nama || "", npm: s.npm });
        setForm((prev) => ({
          ...prev,
          nama: s.nama || "",
          nim: s.npm || "",
        }));
        setIsLoading(false);
      })
      .catch(() => {
        router.push("/daftar");
      });
  }, [router]);

  // Load existing biodata jika sudah pernah isi.
  // Halaman pendaftaran selalu aktif untuk pengisian pertama.
  // Toggle global "edit profil" hanya mengontrol tombol Edit di /mahasiswa,
  // bukan memblokir halaman ini.
  useEffect(() => {
    if (!currentUser?.npm) return;
    fetch(`/api/mahasiswa/biodata?npm=${encodeURIComponent(currentUser.npm)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.profile) {
          const p = data.profile;
          if (p.tempatLahir || p.kkmSemester || p.alamatSekarang) setHasExistingBiodata(true);
          setForm((prev) => ({
            ...prev,
            nama: p.nama || prev.nama,
            tempatLahir: p.tempatLahir || "",
            tanggalLahir: p.tanggalLahir ? String(p.tanggalLahir).slice(0, 10) : "",
            nim: p.npm || prev.nim,
            fakultas: p.fakultas || prev.fakultas,
            prodi: p.prodi || "",
            ipk: p.ipk || "",
            sksLulus: p.sksLulus != null ? String(p.sksLulus) : "",
            sksBelumLulus: p.sksBelumLulus != null ? String(p.sksBelumLulus) : "",
            kelasKuliah: p.kelasKuliah || "Reguler",
            statusPerkawinan: p.statusPerkawinan || "Belum kawin",
            alamatSekarang: p.alamatSekarang || p.alamat || "",
            noTelepon: p.noTelepon || p.noHpMahasiswa || "",
            hpOrtuWali: p.hpOrtuWali || p.noHpOrtu || "",
            email: p.email || "",
            kkmSemester: p.kkmSemester || "Ganjil",
          }));
        }
      })
      .catch(() => {});
  }, [currentUser?.npm]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout error", e);
    }
    router.push("/daftar");
  };

  const handleSubmitBiodata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMessage("Sesi login tidak ditemukan. Silakan login terlebih dahulu.");
      router.push("/daftar");
      return;
    }

    // Validasi wajib
    if (!form.nama.trim() || !form.tempatLahir.trim() || !form.tanggalLahir || !form.nim.trim() || !form.prodi.trim() || !form.ipk.trim() || !form.alamatSekarang.trim() || !form.noTelepon.trim() || !form.hpOrtuWali.trim() || !form.email.trim()) {
      setErrorMessage("Mohon lengkapi semua field wajib yang bertanda *.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/mahasiswa/biodata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npm: currentUser.npm,
          newNpm: form.nim.trim(),
          nama: form.nama.trim(),
          tempatLahir: form.tempatLahir.trim(),
          tanggalLahir: form.tanggalLahir,
          fakultas: form.fakultas,
          prodi: form.prodi.trim(),
          ipk: form.ipk.trim(),
          sksLulus: form.sksLulus ? Number(form.sksLulus) : 0,
          sksBelumLulus: form.sksBelumLulus ? Number(form.sksBelumLulus) : 0,
          kelasKuliah: form.kelasKuliah,
          statusPerkawinan: form.statusPerkawinan,
          alamatSekarang: form.alamatSekarang.trim(),
          noTelepon: form.noTelepon.trim(),
          hpOrtuWali: form.hpOrtuWali.trim(),
          email: form.email.trim(),
          kkmSemester: form.kkmSemester,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Gagal menyimpan biodata.");
        setIsSubmitting(false);
        return;
      }

      // Jika NIM berubah, update currentUser dan profile
      if (data.profile && data.profile.npm && data.profile.npm !== currentUser.npm) {
        setCurrentUser({ nama: data.profile.nama || form.nama, npm: data.profile.npm });
        setForm((prev) => ({ ...prev, nim: data.profile.npm }));
      }
      setSuccessMessage("Biodata berhasil disimpan! Mengalihkan ke portal mahasiswa...");
      setTimeout(() => {
        router.push("/mahasiswa");
      }, 800);
    } catch (e) {
      console.error("API submit biodata error", e);
      setErrorMessage(getErrorMessage(e, "Terjadi kesalahan saat menyimpan biodata. Silakan coba lagi."));
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-[#1A202C] flex items-center justify-center">
        Memuat halaman pendaftaran...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A202C] py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
          <Link
            href="/"
            className="btn-secondary text-xs shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#0F5132]" />
            <span>Kembali ke Beranda Utama</span>
          </Link>

          <div className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="Logo UMuslim" width={32} height={32} className="object-contain" />
            <span className="text-xs font-bold text-[#1A202C] hidden sm:inline">LPPM Universitas Almuslim</span>
          </div>
        </div>

        {/* Step Flow Indicator */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between max-w-2xl mx-auto relative">

            <div className="flex items-center gap-3 z-10">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs bg-[#0F5132] text-white">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-bold text-[#1A202C]">Langkah 1</span>
                <span className="text-[11px] text-[#718096]">Buat Akun</span>
              </div>
            </div>

            <div className="flex-1 mx-4 h-0.5 bg-[#E2E8F0] relative">
              <div className="h-full bg-[#0F5132] transition-all duration-300 w-full" />
            </div>

            <div className="flex items-center gap-3 z-10">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs bg-[#0F5132] text-white ring-4 ring-[#E6F4EA]">
                2
              </div>
              <div>
                <span className="block text-xs font-bold text-[#1A202C]">Langkah 2</span>
                <span className="text-[11px] text-[#718096]">Pendaftaran</span>
              </div>
            </div>

          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <span className="font-bold">Error:</span> {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {currentUser && (
          <form onSubmit={handleSubmitBiodata} className="space-y-6">

            {/* Logged in User Bar */}
            <div className="bg-white border border-[#E2E8F0] p-4 rounded-xl flex items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-[#E6F4EA] border border-[#0F5132]/30 flex items-center justify-center text-[#0F5132] font-bold shrink-0">
                  {currentUser.nama.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[#1A202C] truncate">{currentUser.nama}</span>
                    <span className="badge-academic text-[10px] shrink-0">Akun Aktif</span>
                  </div>
                  <span className="text-xs text-[#718096]">NPM: {currentUser.npm}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-red-600 hover:bg-red-50 border-red-200 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>

            {/* Title Card */}
            <div className="academic-card p-6 rounded-xl bg-white border border-[#E2E8F0] space-y-2">
              <h2 className="text-xl font-extrabold text-[#1A202C]">
                Lengkapi Biodata Mahasiswa KKM
              </h2>
              <p className="text-xs text-[#4A5568] leading-relaxed">
                Lengkapi biodata di bawah ini dengan data yang valid. Data akan digunakan untuk penempatan KKM dan administrasi LPPM.
              </p>
            </div>

            {/* Biodata Form - Responsive */}
            <div className="bg-white border border-[#E2E8F0] p-4 sm:p-6 rounded-xl space-y-6 shadow-xs">
              <div className="border-b border-[#E2E8F0] pb-3">
                <h3 className="text-sm font-extrabold text-[#1A202C] flex items-center gap-2">
                  <User className="w-4 h-4 text-[#0F5132]" />
                  Formulir Biodata Lengkap
                </h3>
                <p className="text-[11px] text-[#718096] mt-1">Field bertanda * wajib diisi.</p>
              </div>
              {hasExistingBiodata && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg p-3 flex items-center gap-2">
                  <User className="w-4 h-4 shrink-0" />
                  <span>Anda sudah pernah mengisi biodata. Menyimpan kembali akan memperbarui data pendaftaran Anda.</span>
                </div>
              )}

              <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#1A202C] mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#0F5132]" /> Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Sesuai KTP / KTM"
                    value={form.nama}
                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs"
                  />
                </div>

                {/* Tempat Lahir */}
                <div>
                  <label className="block text-xs font-bold text-[#1A202C] mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0F5132]" /> Tempat Lahir *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bireuen"
                    value={form.tempatLahir}
                    onChange={(e) => setForm({ ...form, tempatLahir: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs"
                  />
                </div>

                {/* Tanggal Lahir */}
                <div>
                  <label className="block text-xs font-bold text-[#1A202C] mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#0F5132]" /> Tanggal Lahir *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.tanggalLahir}
                    onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs"
                  />
                </div>

                {/* NIM */}
                <div>
                  <label className="block text-xs font-bold text-[#1A202C] mb-1.5 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-[#0F5132]" /> NIM *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nomor Induk Mahasiswa"
                    value={form.nim}
                    onChange={(e) => setForm({ ...form, nim: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs"
                  />
                  <p className="text-[10px] text-[#718096] mt-1">NIM akan tampil di dashboard dan mengikuti database.</p>
                </div>

                {/* Fakultas */}
                <div>
                  <label className="block text-xs font-bold text-[#1A202C] mb-1.5 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#0F5132]" /> Fakultas *
                  </label>
                  <select
                    value={form.fakultas}
                    onChange={(e) => setForm({ ...form, fakultas: e.target.value, prodi: "" })}
                    className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs bg-white"
                  >
                    {fakultasList.map((fakultas) => (
                      <option key={fakultas} value={fakultas}>
                        {fakultas}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prodi */}
                <div>
                  <label className="block text-xs font-bold text-[#1A202C] mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#0F5132]" /> Prodi *
                  </label>
                  <select
                    value={form.prodi}
                    onChange={(e) => setForm({ ...form, prodi: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs bg-white"
                    required
                  >
                    <option value="">-- Pilih Prodi --</option>
                    {fakultasProdiMap[form.fakultas]?.map((prodi) => (
                      <option key={prodi} value={prodi}>
                        {prodi}
                      </option>
                    ))}
                  </select>
                </div>

                {/* IPK */}
                <div>
                  <label className="block text-xs font-bold text-[#1A202C] mb-1.5 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-[#0F5132]" /> IPK *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="4"
                    required
                    placeholder="Contoh: 3.75"
                    value={form.ipk}
                    onChange={(e) => setForm({ ...form, ipk: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs"
                  />
                </div>

                {/* SKS Lulus */}
                <div>
                  <label className="block text-xs font-bold text-[#1A202C] mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#0F5132]" /> SKS Lulus *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    required
                    placeholder="Contoh: 110"
                    value={form.sksLulus}
                    onChange={(e) => setForm({ ...form, sksLulus: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs"
                  />
                </div>

                {/* SKS Belum Lulus */}
                <div>
                  <label className="block text-xs font-bold text-[#1A202C] mb-1.5">SKS Belum Lulus *</label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    required
                    placeholder="Contoh: 30"
                    value={form.sksBelumLulus}
                    onChange={(e) => setForm({ ...form, sksBelumLulus: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs"
                  />
                </div>

                {/* Kelas Kuliah */}
                <div>
                  <label className="block text-xs font-bold text-[#1A202C] mb-1.5">Kelas Kuliah *</label>
                  <select
                    value={form.kelasKuliah}
                    onChange={(e) => setForm({ ...form, kelasKuliah: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs bg-white"
                  >
                    <option value="Reguler">Reguler</option>
                    <option value="Non Reguler">Non Reguler</option>
                  </select>
                </div>

                {/* Status Perkawinan */}
                <div>
                  <label className="block text-xs font-bold text-[#1A202C] mb-1.5 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-[#0F5132]" /> Status Perkawinan *
                  </label>
                  <select
                    value={form.statusPerkawinan}
                    onChange={(e) => setForm({ ...form, statusPerkawinan: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs bg-white"
                  >
                    <option value="Belum kawin">Belum kawin</option>
                    <option value="Kawin">Kawin</option>
                  </select>
                </div>

                {/* Alamat Sekarang - full width */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#1A202C] mb-1.5 flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-[#0F5132]" /> Alamat Sekarang *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Alamat domisili saat ini (jalan, desa, kecamatan, kabupaten)"
                    value={form.alamatSekarang}
                    onChange={(e) => setForm({ ...form, alamatSekarang: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs"
                  />
                </div>

                {/* Nomor Telephone */}
                <div>
                  <label className="block text-xs font-bold text-[#1A202C] mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#0F5132]" /> Nomor Telephone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 081234567890"
                    value={form.noTelepon}
                    onChange={(e) => setForm({ ...form, noTelepon: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs"
                  />
                </div>

                {/* Hp Orang Tua/Wali */}
                <div>
                  <label className="block text-xs font-bold text-[#1A202C] mb-1.5">Hp Orang Tua/Wali *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 081298765432"
                    value={form.hpOrtuWali}
                    onChange={(e) => setForm({ ...form, hpOrtuWali: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-[#1A202C] mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#0F5132]" /> Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="Contoh: nama@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs"
                  />
                </div>

                {/* KKM */}
                <div>
                  <label className="block text-xs font-bold text-[#1A202C] mb-1.5 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#0F5132]" /> KKM *
                  </label>
                  <select
                    value={form.kkmSemester}
                    onChange={(e) => setForm({ ...form, kkmSemester: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs bg-white"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </fieldset>
            </div>

            {/* Submit */}
            <div className="bg-white border border-[#E2E8F0] p-4 sm:p-6 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-[#718096]">Ringkasan Biodata:</span>
                  <div className="font-extrabold text-sm sm:text-base text-[#0F5132] truncate max-w-[260px] sm:max-w-none">{form.nama || currentUser.nama} • {form.nim}</div>
                  <div className="text-xs text-[#4A5568] mt-0.5">
                    {form.fakultas} • {form.prodi || "-"} • KKM {form.kkmSemester}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary py-3.5 px-8 text-xs font-bold justify-center cursor-pointer shadow-md w-full sm:w-auto disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                  <span>{isSubmitting ? "Menyimpan Biodata..." : "Simpan & Lanjutkan ke Portal"}</span>
                </button>
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}

export default function UnggahBerkasPage() {
  return <UnggahBerkasContent />;
}
