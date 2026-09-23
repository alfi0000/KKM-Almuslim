"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  Search,
  User,
  Users,
  Building,
  Filter,
} from "lucide-react";

export default function SebaranGampong() {
  const [gampongData, setGampongData] = useState<any[]>([]);
  const [selectedKec, setSelectedKec] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sebaran")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.gampongs) {
          setGampongData(data.gampongs);
        } else {
          setError(data.error || "Gagal memuat data sebaran gampong.");
        }
      })
      .catch((err) => {
        console.error("Error fetching sebaran gampong:", err);
        setError("Gagal menghubungi server untuk memuat data.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Compute unique kecamatan list dynamically from the fetched gampongs
  const kecamatans = [
    "Semua",
    ...Array.from(new Set(gampongData.map((item) => item.kecamatan).filter(Boolean)))
  ];

  const filteredData = gampongData.filter((item) => {
    const matchesKec = selectedKec === "Semua" || item.kecamatan === selectedKec;
    const matchesQuery =
      (item.nama || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.fokus || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.kordes || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.dpl || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesKec && matchesQuery;
  });

  return (
    <section id="sebaran" className="py-16 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2 mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F5132] flex items-center justify-center gap-1">
            <MapPin className="w-4 h-4 text-[#0F5132]" /> DIREKTORI LOKASI POSKO
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sebaran Gampong Dampingan KKM UMuslim
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Daftar persebaran posko dan fokus kegiatan mahasiswa Kuliah Kerja Masyarakat di berbagai kecamatan Kabupaten Bireuen.
          </p>
        </div>

        {/* Filter & Search Controls */}
        <div className="academic-card p-4 rounded-xl bg-white border border-slate-300 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Gampong, program, kordes, DPL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg academic-input text-xs"
            />
          </div>

          {/* Kecamatan Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-slate-500 shrink-0 hidden md:block mr-1" />
            {kecamatans.map((kec) => (
              <button
                key={kec}
                onClick={() => setSelectedKec(kec)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer shrink-0 ${
                  selectedKec === kec
                    ? "bg-[#0F5132] text-white border-[#0C4128] shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300"
                }`}
              >
                {kec}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="academic-card p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between animate-pulse">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div className="h-5 w-24 bg-slate-200 rounded"></div>
                    <div className="h-5 w-16 bg-slate-200 rounded"></div>
                  </div>
                  <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
                  <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
                  <div className="h-14 bg-slate-100 rounded-lg"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-2/3 bg-slate-200 rounded"></div>
                    <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
                  </div>
                </div>
                <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between">
                  <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
                  <div className="h-4 w-1/4 bg-slate-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 academic-card rounded-xl bg-white border border-red-200 bg-red-50/50">
            <p className="text-red-600 text-xs font-semibold">{error}</p>
          </div>
        ) : (
          /* Gampong Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredData.map((gampong, idx) => (
              <div
                key={idx}
                className="academic-card p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:border-[#0F5132] transition-all"
              >
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#E6F4EA] text-[#0F5132] border border-[#B7E1CD] flex items-center gap-1">
                      <Building className="w-3 h-3 text-[#0F5132]" />
                      Kec. {gampong.kecamatan}
                    </span>
                    <span className="text-[10px] font-bold text-[#0F5132] bg-[#E6F4EA] px-2 py-0.5 rounded border border-[#B7E1CD]">
                      ● {gampong.status}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-900">
                    {gampong.nama}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kabupaten {gampong.kabupaten}
                  </p>

                  {/* Focus */}
                  <div className="mt-3 p-3 rounded-lg bg-[#F8F9FA] border border-[#E2E8F0]">
                    <div className="text-[10px] font-bold text-[#0F5132] uppercase tracking-wider mb-0.5">
                      Fokus Program KKM:
                    </div>
                    <div className="text-xs text-slate-800 font-medium leading-snug">
                      {gampong.fokus}
                    </div>
                  </div>

                  {/* Meta details */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#0F5132] shrink-0" />
                      <span>
                        <strong className="text-slate-500 font-normal">Kordes:</strong> {gampong.kordes}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#0F5132] shrink-0" />
                      <span>
                        <strong className="text-slate-500 font-normal">DPL:</strong> {gampong.dpl}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    <strong>{gampong.mahasiswa}</strong> Mahasiswa
                  </span>
                  <span className="text-slate-500 font-medium truncate max-w-[180px]" title={gampong.posko}>
                    {gampong.posko}
                  </span>
                </div>

              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && filteredData.length === 0 && (
          <div className="text-center py-12 academic-card rounded-xl bg-white mt-6 border border-slate-200">
            <p className="text-slate-500 text-sm">
              Tidak ada data Gampong yang sesuai dengan pencarian &quot;{searchQuery}&quot;.
            </p>
          </div>
        )}

      </div>
    </section>
  );
}

