"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Building,
  BookOpen,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  GraduationCap,
  ShieldCheck,
  LogOut,
  Download,
  Edit3,
  Phone,
  HeartPulse,
  Activity,
  Home,
  Upload,
  Loader2,
} from "lucide-react";
import { handlePrintCard } from "@/lib/printHelper";
import { getErrorMessage } from "@/lib/client-error";

interface StudentProfile {
  nama: string;
  npm: string;
  ipk: string;
  fakultas: string;
  prodi: string;
  program: string;
  tanggalDaftar: string;
  status: string;
  gampong: string;
  dpl: string;
  posko: string;
  golonganDarah?: string;
  riwayatPenyakit?: string;
  noHpMahasiswa?: string;
  noHpOrtu?: string;
  alamat?: string;
  foto?: string;
}

export default function ProfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit Profile Form State
  const [editForm, setEditForm] = useState({
    nama: "",
    npm: "",
    foto: "",
    golonganDarah: "",
    riwayatPenyakit: "",
    noHpMahasiswa: "",
    noHpOrtu: "",
    alamat: "",
  });

  useEffect(() => {
    fetch("/api/auth/session?role=mahasiswa")
      .then((res) => res.json())
      .then((sessionData) => {
        if (!sessionData.success || !sessionData.session?.npm) {
          router.push("/daftar");
          return;
        }
        const npm = sessionData.session.npm;

        fetch(`/api/mahasiswa/profil?npm=${encodeURIComponent(npm)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.profile) {
              setProfile(data.profile);
              setEditForm({
                nama: data.profile.nama || "",
                npm: data.profile.npm || "",
                foto: data.profile.foto || "",
                golonganDarah: data.profile.golonganDarah || "",
                riwayatPenyakit: data.profile.riwayatPenyakit || "",
                noHpMahasiswa: data.profile.noHpMahasiswa || "",
                noHpOrtu: data.profile.noHpOrtu || "",
                alamat: data.profile.alamat || "",
              });
            } else {
              router.push("/daftar");
            }
          })
          .catch((err) => console.error("Error fetching profile", err));
      })
      .catch((err) => console.error("Error reading session", err));
  }, [router]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [modalErrorMessage, setModalErrorMessage] = useState("");

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setModalErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "profile_photo");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal mengunggah foto.");
      }

      setEditForm((prev) => ({ ...prev, foto: data.fileUrl }));
    } catch (err) {
      setModalErrorMessage(getErrorMessage(err, "Gagal mengunggah foto."));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.nama.trim()) {
      setModalErrorMessage("Nama mahasiswa tidak boleh kosong.");
      return;
    }

    setIsSavingProfile(true);
    setModalErrorMessage("");

    try {
      const res = await fetch("/api/mahasiswa/profil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memperbarui profil di server.");
      }

      // Sync local React state
      setProfile(data.profile);

      // Close modal
      setIsEditModalOpen(false);
    } catch (err) {
      setModalErrorMessage(getErrorMessage(err, "Terjadi kesalahan saat menyimpan data."));
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A202C] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
          <Link
            href="/mahasiswa"
            className="btn-secondary text-xs shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#0F5132]" />
            <span>Kembali ke Dashboard Mahasiswa</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/daftar"
              className="btn-secondary text-xs"
            >
              <LogOut className="w-3.5 h-3.5 text-[#0F5132]" />
              <span>Daftar Skema Lain</span>
            </Link>
          </div>
        </div>

        {/* Profile Card Header */}
        {profile && (
          <div className="academic-card p-6 sm:p-8 rounded-lg bg-white border border-[#E2E8F0] shadow-xs relative space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-[#E2E8F0] pb-6">
              
              {/* Left Student Info */}
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-20 h-20 rounded-lg bg-gray-100 border border-[#E2E8F0] shadow-xs shrink-0 flex items-center justify-center overflow-hidden relative">
                  {profile.foto ? (
                    <Image
                      src={profile.foto}
                      alt="Foto Mahasiswa"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-[#1A202C]">
                      {profile.nama}
                    </h1>
                    <span className="badge-academic inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#0F5132]" />
                      {profile.status}
                    </span>
                  </div>

                  <p className="text-xs text-[#0F5132] font-bold flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    <span>{profile.program}</span> • <span>NPM: {profile.npm}</span>
                  </p>

                  <div className="flex items-center gap-4 text-xs text-[#4A5568] flex-wrap pt-1 font-medium">
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-[#718096]" /> {profile.fakultas}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-[#718096]" /> {profile.prodi}
                    </span>
                    <span className="badge-academic font-bold">
                      IPK: {profile.ipk}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Location & DPL Badges */}
              <div className="w-full md:w-auto p-3.5 rounded-md bg-[#F8F9FA] border border-[#E2E8F0] space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[#2D3748]">
                  <MapPin className="w-4 h-4 text-[#0F5132] shrink-0" />
                  <div>
                    <span className="text-[#718096] block text-[10px]">Lokasi Penempatan KKM:</span>
                    <span className="font-bold text-[#1A202C]">{profile.gampong}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[#2D3748] pt-1.5 border-t border-[#E2E8F0]">
                  <User className="w-4 h-4 text-[#0F5132] shrink-0" />
                  <div>
                    <span className="text-[#718096] block text-[10px]">DPL Pembimbing Lapangan:</span>
                    <span className="font-bold text-[#1A202C]">{profile.dpl}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Additional Profile Info Grid */}
            {(profile.golonganDarah || profile.riwayatPenyakit || profile.noHpMahasiswa || profile.noHpOrtu || profile.alamat) && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-b border-[#E2E8F0]/80 pb-6 text-xs">
                {profile.noHpMahasiswa && (
                  <div className="space-y-1">
                    <span className="text-[#718096] block text-[10px] uppercase font-bold tracking-wider">No. HP Mahasiswa:</span>
                    <span className="font-semibold text-[#2D3748] flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#0F5132]" /> {profile.noHpMahasiswa}
                    </span>
                  </div>
                )}
                {profile.noHpOrtu && (
                  <div className="space-y-1">
                    <span className="text-[#718096] block text-[10px] uppercase font-bold tracking-wider">No. HP Ortu / Wali:</span>
                    <span className="font-semibold text-[#2D3748] flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#0F5132]" /> {profile.noHpOrtu}
                    </span>
                  </div>
                )}
                {profile.golonganDarah && (
                  <div className="space-y-1">
                    <span className="text-[#718096] block text-[10px] uppercase font-bold tracking-wider">Golongan Darah:</span>
                    <span className="font-bold text-[#D32F2F] flex items-center gap-1 bg-[#FFEBEE] py-0.5 px-2.5 rounded-full w-fit">
                      <Activity className="w-3.5 h-3.5 text-[#D32F2F]" /> {profile.golonganDarah}
                    </span>
                  </div>
                )}
                {profile.riwayatPenyakit && (
                  <div className="space-y-1">
                    <span className="text-[#718096] block text-[10px] uppercase font-bold tracking-wider">Riwayat Penyakit:</span>
                    <span className="font-semibold text-[#2D3748] flex items-center gap-1 text-amber-700">
                      <HeartPulse className="w-3.5 h-3.5 text-amber-600" /> {profile.riwayatPenyakit}
                    </span>
                  </div>
                )}
                {profile.alamat && (
                  <div className="col-span-full space-y-1">
                    <span className="text-[#718096] block text-[10px] uppercase font-bold tracking-wider">Alamat Lengkap:</span>
                    <span className="font-semibold text-[#2D3748] flex items-center gap-1">
                      <Home className="w-3.5 h-3.5 text-[#0F5132] shrink-0" /> {profile.alamat}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#718096] pt-1">
              <span>Kartu Peserta KKM Angkatan XXXV Universitas Almuslim</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-[#0F5132] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#0F5132]" /> Lengkapi / Edit Biodata
                </button>
                <span className="text-[#E2E8F0]">|</span>
                <button
                  onClick={() => handlePrintCard(profile)}
                  className="hover:text-[#0F5132] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#0F5132]" /> Cetak Kartu Peserta (PDF)
                </button>
              </div>
            </div>
          </div>
        )}



        {/* Modal Lengkapi / Edit Biodata */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="academic-card p-6 rounded-lg bg-white border border-[#CBD5E1] max-w-xl w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <h3 className="text-base font-bold text-[#1A202C] flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#0F5132]" />
                  Lengkapi / Edit Biodata Mahasiswa
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-[#718096] hover:text-[#1A202C] text-xs px-2 py-1 rounded bg-[#F1F5F9] cursor-pointer"
                >
                  ✕ Tutup
                </button>
              </div>

              {modalErrorMessage && (
                <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {modalErrorMessage}
                </div>
              )}

              <form onSubmit={handleEditSubmit} className="space-y-4">
                
                {/* Upload Foto Section */}
                <div className="flex items-center gap-4 bg-[#F8F9FA] p-3.5 rounded-lg border border-[#E2E8F0]">
                  <div className="w-16 h-16 rounded-full bg-white border border-[#CBD5E1] flex items-center justify-center overflow-hidden shrink-0 relative">
                    {editForm.foto ? (
                      <Image src={editForm.foto} alt="Preview Foto" fill className="object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold text-[#2D3748]">Foto Profil Mahasiswa</span>
                    <label className={`btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1 cursor-pointer w-fit ${isUploadingPhoto ? "opacity-50 cursor-not-allowed" : ""}`}>
                      {isUploadingPhoto ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-[#0F5132]" />
                      )}
                      <span>{isUploadingPhoto ? "Mengunggah..." : "Unggah Foto Baru"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isUploadingPhoto}
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nama */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.nama}
                      onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>

                  {/* NPM */}
                  <div>
                    <label className="block text-xs font-semibold text-[#718096] mb-1">
                      NPM (Read-Only)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={editForm.npm}
                      className="w-full px-3 py-2 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] text-xs text-[#718096] cursor-not-allowed"
                    />
                  </div>

                  {/* No HP Mahasiswa */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                      No. HP Mahasiswa
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 0852xxxxxxxx"
                      value={editForm.noHpMahasiswa}
                      onChange={(e) => setEditForm({ ...editForm, noHpMahasiswa: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>

                  {/* No HP Ortu / Wali */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                      No. HP Orang Tua / Wali
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 0813xxxxxxxx"
                      value={editForm.noHpOrtu}
                      onChange={(e) => setEditForm({ ...editForm, noHpOrtu: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>

                  {/* Golongan Darah */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                      Golongan Darah
                    </label>
                    <select
                      value={editForm.golonganDarah}
                      onChange={(e) => setEditForm({ ...editForm, golonganDarah: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    >
                      <option value="">Pilih Golongan Darah</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="AB">AB</option>
                      <option value="O">O</option>
                    </select>
                  </div>

                  {/* Riwayat Penyakit */}
                  <div>
                    <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                      Riwayat Penyakit (Jika ada)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Asma / Maag / Tidak ada"
                      value={editForm.riwayatPenyakit}
                      onChange={(e) => setEditForm({ ...editForm, riwayatPenyakit: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                </div>

                {/* Alamat */}
                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1">
                    Alamat Lengkap
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Masukkan alamat lengkap rumah/domisili..."
                    value={editForm.alamat}
                    onChange={(e) => setEditForm({ ...editForm, alamat: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    disabled={isSavingProfile}
                    onClick={() => setIsEditModalOpen(false)}
                    className="btn-secondary w-1/2 py-2.5 text-xs justify-center cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile || isUploadingPhoto}
                    className="btn-primary w-1/2 py-2.5 text-xs justify-center cursor-pointer"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Simpan Perubahan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
