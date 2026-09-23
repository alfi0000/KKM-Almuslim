"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock } from "lucide-react";

interface TimelineItem {
  id: number;
  tahap: string;
  tanggal: string;
  judul: string;
  deskripsi: string;
  status: string;
  isCurrent: boolean;
}

function withTahap(items: Omit<TimelineItem, "tahap">[]): TimelineItem[] {
  return items.map((item, index) => ({
    ...item,
    tahap: `Tahap ${String(index + 1).padStart(2, "0")}`,
  }));
}

export default function TimelineSection() {
  const [timelineEvents, setTimelineEvents] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/timeline")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && Array.isArray(data.timeline)) {
          const mapped = data.timeline.map((t: Record<string, unknown>) => ({
            id: t.id as number,
            judul: t.judul as string,
            tanggal: t.tanggal as string,
            deskripsi: (t.deskripsi as string) || "",
            status: (t.status as string) || "Akan Datang",
            isCurrent: t.status === "Berlangsung",
          }));
          setTimelineEvents(withTahap(mapped));
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="jadwal" className="py-16 bg-white border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F5132] flex items-center justify-center gap-1">
            <Calendar className="w-4 h-4 text-[#0F5132]" /> JADWAL KKM ANGKATAN XXXV
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A202C] tracking-tight">
            Timeline Pelaksanaan KKM
          </h2>
          <p className="text-[#4A5568] text-sm leading-relaxed">
            Tahapan agenda resmi pelaksanaan Kuliah Kerja Masyarakat (KKM) Universitas Almuslim Tahun Akademik 2026/2027.
          </p>
        </div>

        {/* Timeline Content */}
        {loading ? (
          <div className="text-center text-xs text-[#718096] py-8">Memuat jadwal...</div>
        ) : timelineEvents.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#718096] space-y-2 max-w-xl mx-auto rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8F9FA]">
            <Calendar className="w-10 h-10 text-[#CBD5E1] mx-auto" />
            <p>Belum ada jadwal yang dipublikasikan. Timeline pelaksanaan akan tersedia setelah diatur oleh admin LPPM.</p>
          </div>
        ) : (
          <div className="relative max-w-4xl mx-auto">
            {/* Vertical Timeline Line */}
            <div className="absolute left-4 sm:left-1/2 top-4 bottom-4 w-0.5 bg-[#CBD5E1] -translate-x-1/2 hidden sm:block" />

            <div className="space-y-6 sm:space-y-8">
              {timelineEvents.map((item, index) => {
                const isEven = index % 2 === 0;
                return (
                  <div
                    key={item.id}
                    className={`relative flex flex-col sm:flex-row items-start ${
                      isEven ? "sm:flex-row-reverse" : ""
                    } gap-4 sm:gap-8`}
                  >
                    {/* Timeline Badge Dot */}
                    <div className={`absolute left-4 sm:left-1/2 top-5 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-xs hidden sm:block z-10 ${
                      item.isCurrent ? "bg-[#0F5132]" : "bg-[#CBD5E1]"
                    }`} />

                    {/* Content Box */}
                    <div className="w-full sm:w-1/2">
                      <div
                        className={`academic-card p-5 rounded-lg bg-white border ${
                          item.isCurrent
                            ? "border-[#0F5132] ring-2 ring-[#0F5132]/15 shadow-xs"
                            : "border-[#E2E8F0]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="badge-academic text-[10px]">
                            {item.tahap}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              item.isCurrent
                                ? "bg-[#E6F4EA] text-[#0F5132] border-[#B7E1CD]"
                                : item.status === "Selesai"
                                  ? "bg-[#E2E8F0] text-[#4A5568] border-[#CBD5E1]"
                                  : "bg-[#F1F5F9] text-[#718096] border-[#CBD5E1]"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-[#0F5132] flex items-center gap-1 mb-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{item.tanggal}</span>
                        </div>

                        <h3 className="font-bold text-[#1A202C] text-base mb-1.5">
                          {item.judul}
                        </h3>

                        <p className="text-xs text-[#4A5568] leading-relaxed">
                          {item.deskripsi}
                        </p>
                      </div>
                    </div>

                    <div className="hidden sm:block w-1/2" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
