"use client";

import { useEffect, useState } from "react";
import { Building2, Target, Users, ShieldCheck } from "lucide-react";

interface StrukturItem {
  id?: number;
  label: string;
  value: string;
}


export default function AboutSection() {
  const [strukturItems, setStrukturItems] = useState<StrukturItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/struktur")
      .then((res) => res.json())
      .then((resData) => {
        if (isMounted && resData.success) {
          setStrukturItems(resData.data || []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setStrukturItems([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const itemsToRender = strukturItems;

  return (
    <section id="tentang" className="py-16 bg-white border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-6 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F5132] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0F5132]" /> PROFIL PENGABDIAN KAMPUS
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A202C] tracking-tight">
              Tentang KKM Universitas Almuslim
            </h2>
            <p className="text-[#4A5568] text-sm leading-relaxed">
              Kuliah Kerja Masyarakat (KKM) Universitas Almuslim merupakan kegiatan intrakurikuler wajib yang mengintegrasikan pengajaran, penelitian, dan pengabdian masyarakat. Di bawah koordinasi Lembaga Penelitian dan Pengabdian kepada Masyarakat (LPPM), mahasiswa diterjunkan langsung untuk membantu pembangunan gampong di Kabupaten Bireuen dan sekitarnya.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-[#E2E8F0] flex items-start gap-2.5">
                <Target className="w-5 h-5 text-[#0F5132] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-[#1A202C]">Visi Pengabdian</h4>
                  <p className="text-[11px] text-[#718096] mt-0.5">Mewujudkan gampong mandiri, sejahtera, dan berbasis digitalisasi.</p>
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F8F9FA] border border-[#E2E8F0] flex items-start gap-2.5">
                <Users className="w-5 h-5 text-[#0F5132] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs text-[#1A202C]">Sinergi Berkelanjutan</h4>
                  <p className="text-[11px] text-[#718096] mt-0.5">Kemitraan erat antara civitas akademika, pemerintah daerah, & warga.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="academic-card p-6 rounded-lg bg-[#F8F9FA] border border-[#E2E8F0] space-y-4">
              <h3 className="font-extrabold text-base text-[#1A202C] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#0F5132]" />
                Struktur Pelaksana LPPM UMuslim
              </h3>
              <div className="space-y-2 text-xs text-[#2D3748]">
                {itemsToRender.length === 0 ? (
                  <div className="p-3 rounded border border-dashed border-[#CBD5E1] bg-white text-center text-[#A0AEC0]">
                    Struktur pelaksana akan tampil setelah diatur oleh admin LPPM.
                  </div>
                ) : (
                  itemsToRender.map((item, index) => (
                    <div
                      key={`${item.label}-${index}`}
                      className="p-3 rounded bg-white border border-[#E2E8F0] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1"
                    >
                      <span>{item.label}</span>
                      <span className="font-bold text-[#0F5132] text-left sm:text-right">{item.value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
