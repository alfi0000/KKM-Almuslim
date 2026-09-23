"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  GraduationCap,
  Globe,
  Briefcase,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Award,
  UserCheck,
  FileEdit,
  Building,
} from "lucide-react";

export default function ProgramUnggulan() {
  const [activeTab, setActiveTab] = useState(0);

  const programs = [
    {
      id: "reguler",
      title: "KKM Reguler",
      category: "Program Utama LPPM",
      badge: "Reguler Kampus",
      icon: GraduationCap,
      image: "/images/kkm_reguler.jpg",
      summary:
        "Program KKM Reguler diperuntukkan bagi mahasiswa aktif Universitas Almuslim yang telah memenuhi kriteria SKS. Pengabdian dilakukan secara berkelompok di gampong-gampong sasaran Kabupaten Bireuen dan sekitarnya.",
      requirements: [
        "Telah menyelesaikan minimal 100 SKS",
        "Terdaftar aktif pada semester berjalan",
        "Bersedia ditempatkan di lokasi gampong sasaran",
        "Mengikuti pembekalan & pembimbingan DPL",
      ],
      benefits: [
        "Konversi 4 SKS Mata Kuliah Pengabdian",
        "Sertifikat Resmi KKM LPPM UMuslim",
        "Pengalaman Pengabdian Desa Langsung",
      ],
    },
    {
      id: "internasional",
      title: "KKM Internasional",
      category: "Global & Overseas",
      badge: "Pengalaman Global",
      icon: Globe,
      image: "/images/kkm_internasional.jpg",
      summary:
        "Program KKM Internasional memberikan kesempatan bagi mahasiswa UMuslim untuk melaksanakan pengabdian masyarakat di tingkat mancanegara melalui kemitraan perguruan tinggi dan lembaga internasional.",
      requirements: [
        "IPK Minimal 3.25",
        "Kemampuan Bahasa Inggris / Asing aktif",
        "Memiliki Paspor aktif min. 6 bulan",
        "Lolos seleksi wawancara & portofolio LPPM",
      ],
      benefits: [
        "Pengalaman Pengabdian Tingkat Internasional",
        "Sertifikat Kolaborasi Lintas Negara",
        "Jaringan Jejaring Akademik Global",
      ],
    },
    {
      id: "non-reg",
      title: "KKM Non-Reguler",
      category: "Rekognisi & MBKM",
      badge: "Jalur Khusus",
      icon: Briefcase,
      image: "/images/kkm_non_reguler.jpg",
      summary:
        "Program KKM Non-Reguler (Non-Reg) diperuntukkan bagi mahasiswa jalur khusus, wirausaha desa, magang pengabdian MBKM, atau mahasiswa pekerja yang memiliki proyek pengabdian terarah.",
      requirements: [
        "Rekomendasi dari Dekan / Ketua Prodi",
        "Proposal Proyek Pengabdian / Wirausaha Desa",
        "Mahasiswa Kelas Khusus / Pekerja / MBKM",
        "Laporan Proyek Berkala ke LPPM",
      ],
      benefits: [
        "Fleksibilitas Jadwal & Lokasi Proyek",
        "Rekognisi Program MBKM / Proyek Desa",
        "Pendampingan Khusus DPL Pembimbing",
      ],
    },
  ];

  const currentProgram = programs[activeTab];

  return (
    <section id="program" className="py-16 bg-[#F8F9FA] border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6 border-b border-[#E2E8F0] pb-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F5132] flex items-center gap-1.5">
              <Building className="w-4 h-4 text-[#0F5132]" /> SKEMA TERDAFTAR LPPM UNIVERSITAS ALMUSLIM
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A202C] tracking-tight">
              Skema Program Kuliah Kerja Masyarakat (KKM)
            </h2>
            <p className="text-[#4A5568] text-sm max-w-2xl">
              LPPM Universitas Almuslim menyediakan 3 skema resmi pelaksanaan KKM. Silakan pilih skema di bawah ini untuk melihat persyaratan dan mendaftar.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/mahasiswa"
              className="btn-secondary text-xs"
            >
              <UserCheck className="w-4 h-4 text-[#0F5132]" />
              <span>Portal Role Mahasiswa</span>
            </Link>
          </div>
        </div>

        {/* 3 Main Program Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {programs.map((prog, index) => {
            const Icon = prog.icon;
            const isActive = activeTab === index;
            return (
              <button
                key={prog.id}
                onClick={() => setActiveTab(index)}
                className={`p-6 rounded-lg text-left transition-all relative border flex flex-col justify-between cursor-pointer ${
                  isActive
                    ? "bg-white border-[#0F5132] ring-2 ring-[#0F5132]/20 shadow-xs"
                    : "bg-white hover:bg-[#F1F5F9] border-[#E2E8F0]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-10 h-10 rounded-md flex items-center justify-center border ${
                        isActive
                          ? "bg-[#0F5132] text-white border-[#0C4128]"
                          : "bg-[#F1F5F9] text-[#2D3748] border-[#CBD5E1]"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        isActive
                          ? "badge-academic"
                          : "bg-[#F1F5F9] text-[#4A5568] border border-[#CBD5E1]"
                      }`}
                    >
                      {prog.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#1A202C] mb-2">{prog.title}</h3>
                  <p className="text-xs text-[#4A5568] line-clamp-2 leading-relaxed mb-4">
                    {prog.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs font-semibold">
                  <span className={isActive ? "text-[#0F5132]" : "text-[#718096]"}>
                    {isActive ? "✓ Skema Terpilih" : "Lihat Persyaratan"}
                  </span>
                  <ArrowRight
                    className={`w-4 h-4 ${
                      isActive ? "text-[#0F5132]" : "text-[#A0AEC0]"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Program Showcase & Registration CTA */}
        <div className="academic-card p-6 sm:p-8 rounded-lg border border-[#E2E8F0] bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Side: Program Information Details */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex items-center gap-2.5">
                <span className="badge-academic">
                  {currentProgram.category}
                </span>
                <span className="badge-academic">
                  {currentProgram.badge}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-[#E6F4EA] text-[#0F5132] border border-[#B7E1CD]">
                  <currentProgram.icon className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-[#1A202C]">
                  {currentProgram.title}
                </h3>
              </div>

              <p className="text-[#4A5568] text-sm leading-relaxed">
                {currentProgram.summary}
              </p>

              {/* Requirements & Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <h4 className="text-xs uppercase font-bold text-[#1A202C] tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#0F5132]" />
                    Persyaratan Peserta:
                  </h4>
                  <div className="space-y-1.5">
                    {currentProgram.requirements.map((req, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-[#F8F9FA] border border-[#E2E8F0] flex items-start gap-2 text-xs text-[#2D3748]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0F5132] shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs uppercase font-bold text-[#1A202C] tracking-wider mb-2 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#0F5132]" />
                    Keuntungan Program:
                  </h4>
                  <div className="space-y-1.5">
                    {currentProgram.benefits.map((benefit, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-[#E6F4EA] border border-[#B7E1CD] flex items-center gap-2 text-xs text-[#0F5132]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0F5132] shrink-0" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href={`/daftar?program=${currentProgram.id}`}
                  className="btn-primary px-6 py-3 text-xs font-bold w-full sm:w-auto"
                >
                  <FileEdit className="w-4 h-4 text-white" />
                  <span>Daftar {currentProgram.title}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>

                <Link
                  href="/mahasiswa"
                  className="btn-secondary px-5 py-3 text-xs font-semibold w-full sm:w-auto"
                >
                  <UserCheck className="w-4 h-4 text-[#0F5132]" />
                  <span>Portal Role Mahasiswa</span>
                </Link>
              </div>

            </div>

            {/* Right Side Image Banner */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-[4/3] rounded-md overflow-hidden border border-[#CBD5E1] shadow-xs">
                <Image
                  src={currentProgram.image}
                  alt={currentProgram.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded bg-white/95 text-xs text-[#1A202C] border border-[#E2E8F0]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold block">{currentProgram.title}</span>
                      <span className="text-[11px] text-[#718096]">LPPM Universitas Almuslim</span>
                    </div>
                    <span className="badge-academic text-[10px]">
                      TA. 2026/2027
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
