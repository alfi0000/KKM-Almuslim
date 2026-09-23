"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "Apa saja syarat utama untuk mendaftar KKM Universitas Almuslim?",
      a: "Mahasiswa wajib terdaftar aktif pada semester berjalan, telah menyelesaikan minimal 100 SKS, serta telah mengisi KPRS/KRS mata kuliah KKM.",
    },
    {
      q: "Bagaimana proses penentuan lokasi posko dan pembagian kelompok?",
      a: "Penentuan lokasi posko gampong dan penetapan anggota kelompok dilakukan secara transparan oleh LPPM UMuslim berdasarkan koordinasi dengan Camat dan Keuchik setempat.",
    },
    {
      q: "Apakah mahasiswa pekerja dapat memilih skema KKM Non-Reguler?",
      a: "Ya, mahasiswa kelas khusus atau pekerja dapat mengajukan pendaftaran KKM Non-Reguler dengan melampirkan surat rekomendasi Dekan/Prodi serta proposal proyek pengabdian terarah.",
    },
    {
      q: "Bagaimana cara pengisian logbook harian KKM?",
      a: "Pengisian logbook dilakukan secara online melalui Halaman Profil & Logbook di portal ini. Setiap catatan harian mencakup tanggal, lokasi, deskripsi kegiatan, dan lampiran foto dokumentasi.",
    },
  ];

  return (
    <section id="faq" className="py-16 bg-[#F8F9FA] border-b border-[#E2E8F0]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center space-y-2 mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F5132] flex items-center justify-center gap-1">
            <HelpCircle className="w-4 h-4 text-[#0F5132]" /> PERTANYAAN UMUM (FAQ)
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A202C] tracking-tight">
            Pertanyaan Sering Diajukan
          </h2>
          <p className="text-[#4A5568] text-sm">
            Informasi lengkap seputar mekanisme pendaftaran dan pelaksanaan KKM UMuslim.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="academic-card rounded-lg bg-white border border-[#E2E8F0] overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left font-bold text-sm text-[#1A202C] flex items-center justify-between gap-4 cursor-pointer hover:bg-[#F8F9FA] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#0F5132] shrink-0 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 text-xs sm:text-sm text-[#4A5568] border-t border-[#E2E8F0] pt-3 leading-relaxed bg-[#F8F9FA]">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
