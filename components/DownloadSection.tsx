"use client";

import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";

interface DocumentItem {
  id: number;
  judul: string;
  kategori: string;
  ukuran: string;
  format: string;
  deskripsi: string;
  fileUrl: string;
}

function formatUkuran(bytes: number): string {
  if (!bytes || bytes <= 0) return "-";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function DownloadSection() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dokumen")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success && Array.isArray(data.dokumen)) {
          const mapped = data.dokumen.map((d: Record<string, unknown>) => ({
            id: d.id as number,
            judul: d.judul as string,
            kategori: d.kategori as string,
            ukuran: formatUkuran(Number(d.ukuran)),
            format: String(d.format || "").toUpperCase(),
            deskripsi: (d.deskripsi as string) || "",
            fileUrl: d.fileUrl as string,
          }));
          setDocuments(mapped);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="unduhan" className="py-16 bg-white border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2 mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F5132] flex items-center justify-center gap-1">
            <Download className="w-4 h-4 text-[#0F5132]" /> PUSAT UNDUHAN DOKUMEN LPPM
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A202C] tracking-tight">
            Dokumen & Buku Pedoman KKM
          </h2>
          <p className="text-[#4A5568] text-sm leading-relaxed">
            Unduh berkas resmi administrasi, buku pedoman, dan format laporan pelaksanaan KKM Universitas Almuslim.
          </p>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="text-center text-xs text-[#718096] py-8">Memuat dokumen...</div>
        ) : documents.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#718096] space-y-2 max-w-xl mx-auto rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8F9FA]">
            <FileText className="w-10 h-10 text-[#CBD5E1] mx-auto" />
            <p>Belum ada dokumen yang dipublikasikan. Dokumen resmi akan tersedia setelah diunggah oleh admin LPPM.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="academic-card p-5 rounded-lg bg-white border border-[#E2E8F0] flex flex-col sm:flex-row items-start justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="badge-academic text-[10px]">
                      {doc.kategori}
                    </span>
                    <span className="text-[10px] font-mono text-[#718096]">
                      {doc.format} • {doc.ukuran}
                    </span>
                  </div>

                  <h3 className="font-bold text-[#1A202C] text-base leading-snug">
                    {doc.judul}
                  </h3>

                  <p className="text-xs text-[#4A5568] leading-relaxed">
                    {doc.deskripsi}
                  </p>
                </div>

                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="btn-primary text-xs shrink-0 self-end sm:self-center cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-300" />
                  <span>Unduh</span>
                </a>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
