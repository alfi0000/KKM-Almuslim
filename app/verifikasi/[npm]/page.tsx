"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle,
  AlertTriangle,
  Loader2,
  Home,
  User,
  MapPin,
  Building,
  GraduationCap,
  Calendar,
  ShieldCheck,
} from "lucide-react";

interface PageProps {
  params: Promise<{ npm: string }>;
}

interface StudentProfileRecord {
  nama: string;
  npm: string;
  program: string;
  prodi: string;
  fakultas: string;
  gampong: string;
  kecamatan: string;
  posko: string;
  dpl: string;
  tanggalDaftar: string;
  foto?: string;
}

export default function VerificationPage({ params }: PageProps) {
  const unwrappedParams = React.use(params);
  const npm = unwrappedParams.npm;

  const [profile, setProfile] = useState<StudentProfileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!npm) return;

    const token = new URLSearchParams(window.location.search).get("token") || "";
    fetch(`/api/verifikasi/${encodeURIComponent(npm)}?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.profile) {
          setProfile(data.profile);
        } else {
          setError(
            "Mahasiswa dengan NPM tersebut tidak aktif atau tidak terdaftar dalam sistem Kuliah Kerja Masyarakat (KKM) Universitas Almuslim."
          );
        }
      })
      .catch((err) => {
        console.error("Verification fetch error:", err);
        setError("Terjadi masalah saat menghubungi server verifikasi.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [npm]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-xl bg-white border border-[#CBD5E1] rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header Univ */}
        <div className="bg-[#0F5132] p-6 text-center text-white relative">
          <div className="absolute top-4 left-4 flex items-center gap-1 opacity-20">
            <ShieldCheck className="w-16 h-16 text-white" />
          </div>
          
          <div className="relative flex flex-col items-center space-y-2">
            <Image
              src="/images/logo.png"
              alt="Logo UMuslim"
              width={64}
              height={64}
              className="object-contain filter brightness-0 invert"
            />
            <div className="space-y-0.5">
              <h1 className="font-extrabold text-sm tracking-wider">UNIVERSITAS ALMUSLIM</h1>
              <p className="text-[10px] uppercase font-bold text-green-200 tracking-widest">
                Lembaga Penelitian dan Pengabdian kepada Masyarakat (LPPM)
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8 space-y-6">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-10 h-10 text-[#0F5132] animate-spin" />
              <p className="text-xs text-slate-500 font-semibold tracking-wide">
                Memverifikasi keaslian identitas peserta...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="space-y-6 text-center py-6">
              <div className="mx-auto w-14 h-14 bg-red-50 border border-red-200 rounded-full flex items-center justify-center text-red-600">
                <AlertTriangle className="w-7 h-7" />
              </div>
              
              <div className="space-y-2 max-w-sm mx-auto">
                <h3 className="text-base font-extrabold text-slate-800">
                  Verifikasi Gagal / Tidak Valid
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {error}
                </p>
              </div>

              <div className="pt-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-all"
                >
                  <Home className="w-4 h-4" />
                  Kembali ke Beranda
                </Link>
              </div>
            </div>
          )}

          {profile && !loading && (
            <div className="space-y-6">
              {/* Verification Status Banner */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
                <div className="space-y-0.5">
                  <h3 className="text-xs font-extrabold text-green-800 tracking-wide">
                    STATUS KARTU: TERVERIFIKASI & AKTIF
                  </h3>
                  <p className="text-[10px] text-green-600 font-semibold leading-none">
                    Peserta resmi Kuliah Kerja Masyarakat (KKM) Angkatan XXXV
                  </p>
                </div>
              </div>

              {/* Grid Data */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                {/* Foto */}
                <div className="sm:col-span-4 aspect-[3/4] bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl flex items-center justify-center text-center p-2 text-slate-400 overflow-hidden relative w-full max-w-[150px] mx-auto shadow-inner">
                  {profile.foto ? (
                    <Image
                      src={profile.foto}
                      alt="Foto Mahasiswa"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="space-y-1">
                      <User className="w-12 h-12 text-[#0F5132] mx-auto" />
                      <div className="text-[10px] font-bold text-[#718096]">FOTO 3x4</div>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="sm:col-span-8 space-y-3.5 text-xs text-slate-700">
                  <div className="pb-1 border-b border-slate-100">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Nama Lengkap</span>
                    <h2 className="font-extrabold text-sm text-[#1A202C]">{profile.nama}</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pb-1 border-b border-slate-100">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">NPM</span>
                      <p className="font-bold text-[#1A202C]">{profile.npm}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Skema KKM</span>
                      <p className="font-bold text-[#0F5132]">{profile.program}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pb-1 border-b border-slate-100">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-0.5">
                        <GraduationCap className="w-3.5 h-3.5" /> Prodi / Fakultas
                      </span>
                      <p className="font-medium text-[11px] text-slate-600">{profile.prodi}</p>
                      <p className="text-[10px] text-slate-400">{profile.fakultas}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-0.5">
                        <MapPin className="w-3.5 h-3.5" /> Penugasan Posko
                      </span>
                      <p className="font-bold text-[11px] text-[#1A202C]">{profile.gampong}</p>
                      <p className="text-[10px] text-slate-500">Kec. {profile.kecamatan}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-0.5">
                        <Building className="w-3.5 h-3.5" /> Posko & DPL
                      </span>
                      <p className="font-medium text-[11px] text-slate-600">{profile.posko}</p>
                      <p className="text-[10px] text-slate-500">DPL: {profile.dpl}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-0.5">
                        <Calendar className="w-3.5 h-3.5" /> Tanggal Registrasi
                      </span>
                      <p className="font-medium text-[11px] text-slate-600">{profile.tanggalDaftar}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-slate-150 flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-semibold italic">
                  Sistem Informasi Kuliah Kerja Mahasiswa Almuslim (SIKKMA) LPPM UMuslim 2026/2027
                </span>
                
                <Link
                  href="/"
                  className="flex items-center gap-1 px-4 py-2 bg-[#0F5132] hover:bg-[#0C4128] text-white font-bold text-xs rounded-lg transition-all shadow-xs"
                >
                  <Home className="w-3.5 h-3.5" />
                  Kembali ke Beranda
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
