"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FileEdit,
  ArrowRight,
  MapPin,
  Users,
  Building2,
  Award,
  Calendar,
  ChevronRight,
} from "lucide-react";

interface Announcement {
  label: string;
  message: string;
  deadline?: string;
}

export default function HeroSection() {
  const [statsData, setStatsData] = useState({
    mahasiswa: "—",
    gampong: "—",
    kecamatan: "—",
    angkatan: "—",
  });
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.stats) {
            const { mahasiswa, gampong, kecamatan, angkatan } = data.stats;
            setStatsData({
              mahasiswa: mahasiswa.toLocaleString("id-ID"),
              gampong: gampong.toLocaleString("id-ID"),
              kecamatan: kecamatan.toLocaleString("id-ID"),
              angkatan: angkatan || "XXXV",
            });
          }
        }
      } catch (err) {
        console.error("Gagal memuat statistik database:", err);
      }
    }

    loadStats();
  }, []);

  useEffect(() => {
    async function loadAnnouncement() {
      try {
        const res = await fetch("/api/announcement");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.announcement) {
            setAnnouncement({
              label: data.announcement.label,
              message: data.announcement.message,
              deadline: data.announcement.deadline,
            });
          }
        }
      } catch (err) {
        console.error("Gagal memuat pengumuman:", err);
      }
    }

    loadAnnouncement();
  }, []);

  const stats = [
    { label: "Mahasiswa Peserta", value: statsData.mahasiswa, icon: Users },
    { label: "Gampong Dampingan", value: statsData.gampong, icon: MapPin },
    { label: "Kecamatan Sasaran", value: statsData.kecamatan, icon: Building2 },
    { label: "Angkatan Pengabdian", value: statsData.angkatan, icon: Award },
  ];

  const deadlineText = announcement?.deadline
    ? new Date(announcement.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "25 Juli 2026";

  return (
    <section id="beranda" className="hero-campus overflow-hidden pt-6 pb-14 sm:pt-10 sm:pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Academic Notice Banner */}
        {announcement ? (
          <div className="bg-white/90 border border-[#d9e6dc] rounded-2xl p-3.5 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#2D3748] shadow-[0_12px_28px_-24px_rgba(7,54,40,0.45)]">
            <div className="flex items-center gap-2.5">
              <span className="badge-academic uppercase tracking-[0.12em] text-[10px]">
                {announcement.label}
              </span>
              <span className="font-semibold text-[#1A202C]">
                {announcement.message}
              </span>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 text-xs">
              <span className="flex items-center gap-1 text-[#718096]">
                <Calendar className="w-3.5 h-3.5 text-[#0F5132]" /> Batas Pendaftaran: {deadlineText}
              </span>
            </div>
          </div>
        ) : null}

        {/* Hero Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-7">
            
            <div className="space-y-3">
              <span className="section-kicker text-[11px] font-extrabold uppercase flex items-center gap-2">
                <span className="h-px w-8 bg-[#c89d4b]" />
                Lembaga Penelitian dan Pengabdian kepada Masyarakat (LPPM)
              </span>

              <h1 className="max-w-3xl text-4xl sm:text-5xl lg:text-[3.65rem] font-extrabold text-[#17362b] tracking-[-0.045em] leading-[1.08]">
                Dari kampus, hadir untuk <span className="text-[#0d5c46]">memberdayakan gampong.</span>
              </h1>
            </div>

            <p className="text-[#52665c] text-[15px] sm:text-base leading-7 font-normal max-w-2xl">
              SIKKMA adalah ruang layanan terpadu untuk perjalanan pengabdian mahasiswa Universitas Almuslim—mulai dari pendaftaran hingga pelaporan kegiatan di gampong dampingan.
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-4">
              <Link
                href="/daftar"
                className="btn-primary px-7 py-3.5 text-sm font-bold shadow-[0_14px_24px_-14px_rgba(13,92,70,0.85)]"
              >
                <FileEdit className="w-4 h-4 text-[#f0ce82]" />
                <span>Daftar KKM</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
              <a href="#tentang" className="inline-flex items-center gap-1 text-sm font-bold text-[#0d5c46] hover:text-[#084332]">
                Jelajahi KKM <ChevronRight className="w-4 h-4" />
              </a>
            </div>


          </div>

          {/* Right Photography Layout */}
          <div className="lg:col-span-5">
            <div className="relative p-2.5 rounded-[1.5rem] bg-white border border-[#d7e5db] shadow-[0_24px_54px_-36px_rgba(8,68,49,0.7)]">
              <div className="relative aspect-[4/3] rounded-[1rem] overflow-hidden">
                <Image
                  src="/images/kkm_hero_v3.jpg"
                  alt="Kegiatan Pengabdian KKM Universitas Almuslim"
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 40vw"
                  className="object-cover"
                  priority
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a392b]/75 via-transparent to-transparent" />
                <div className="absolute top-4 right-4 badge-academic bg-white/95 border-white/80 text-[10px] shadow-sm">KKM UMuslim</div>
                <div className="absolute bottom-3 left-3 right-3 p-3.5 rounded-xl bg-white/95 text-xs text-[#1A202C] shadow-sm border border-white/70">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold block">Dokumentasi Pengabdian Mahasiswa</span>
                      <span className="text-[11px] text-[#718096]">Kabupaten Bireuen, Provinsi Aceh</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Clean Statistics Grid */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat, i) => {
            const IconComp = stat.icon;
            return (
              <div
                key={i}
                className="academic-card p-4 sm:p-4.5 bg-white/90 border border-[#dfe9e1] flex items-center gap-3 sm:gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-[#eef5ef] border border-[#cfe2d5] flex items-center justify-center shrink-0">
                  <IconComp className="w-5 h-5 text-[#0d5c46]" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-[#1A202C] tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-xs font-medium text-[#718096]">
                    {stat.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
