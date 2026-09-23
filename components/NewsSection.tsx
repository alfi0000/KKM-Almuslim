"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Newspaper, Calendar, ArrowRight, X, User } from "lucide-react";

interface Article {
  id: number;
  title: string;
  category: string;
  date: string;
  author: string;
  image: string;
  content: string;
}

export default function NewsSection() {
  const [selectedArticle, setSelectedArticle] = useState<null | Article>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/berita")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.berita)) {
          const mapped = data.berita.map((b: Record<string, unknown>) => ({
            id: b.id as number,
            title: b.judul as string,
            category: b.kategori as string,
            date: b.tanggal as string,
            author: b.penulis as string,
            image: b.gambar as string,
            content: b.konten as string,
          }));
          setArticles(mapped);
        }
      })
      .catch(() => {
        // silently fail — will show empty state
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="berita" className="py-16 bg-[#F8F9FA] border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4 border-b border-[#E2E8F0] pb-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F5132] flex items-center gap-1">
              <Newspaper className="w-4 h-4 text-[#0F5132]" /> WARTA LPPM & PENGABDIAN
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A202C] tracking-tight">
              Berita & Pengumuman Terbaru
            </h2>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-[#718096]">
            <div className="w-8 h-8 border-4 border-[#E2E8F0] border-t-[#0F5132] rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium">Memuat berita...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-[#718096]">
            <Newspaper className="w-12 h-12 mb-4 text-[#CBD5E0]" />
            <p className="text-sm font-medium">Belum ada berita</p>
          </div>
        )}

        {/* Articles Grid */}
        {!loading && articles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {articles.map((item) => (
            <div
              key={item.id}
              className="academic-card p-4 rounded-lg bg-white border border-[#E2E8F0] flex flex-col justify-between hover:border-[#0F5132] transition-all"
            >
              <div>
                <div className="relative aspect-[16/10] rounded-md overflow-hidden mb-3 border border-[#E2E8F0]">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[11px] text-[#A0AEC0] font-semibold">Tanpa Gambar</div>
                  )}
                  <span className="absolute top-2 left-2 badge-academic text-[10px]">
                    {item.category}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-[#718096] mb-2 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#0F5132]" /> {item.date}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#718096]" /> {item.author}
                  </span>
                </div>

                <h3 className="font-bold text-[#1A202C] text-base leading-snug mb-2 hover:text-[#0F5132] transition-colors">
                  {item.title}
                </h3>

                <p className="text-xs text-[#4A5568] leading-relaxed line-clamp-3 mb-4">
                  {item.content}
                </p>
              </div>

              <button
                onClick={() => setSelectedArticle(item)}
                className="text-xs font-bold text-[#0F5132] hover:underline flex items-center gap-1 pt-2 border-t border-[#E2E8F0] cursor-pointer"
              >
                <span>Baca Selengkapnya</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        )}

        {/* Article Reader Modal */}
        {selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="academic-card p-6 rounded-lg bg-white border border-[#E2E8F0] max-w-2xl w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <span className="badge-academic">{selectedArticle.category}</span>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="p-1 rounded text-[#718096] hover:text-[#1A202C] bg-[#F1F5F9]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-xl font-bold text-[#1A202C]">
                {selectedArticle.title}
              </h2>

              <div className="flex items-center gap-4 text-xs text-[#718096]">
                <span>Tanggal: {selectedArticle.date}</span>
                <span>Penulis: {selectedArticle.author}</span>
              </div>

              <div className="relative aspect-[16/9] rounded-md overflow-hidden border border-[#E2E8F0]">
                {selectedArticle.image ? (
                  <Image src={selectedArticle.image} alt={selectedArticle.title} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[11px] text-[#A0AEC0] font-semibold">Tanpa Gambar</div>
                )}
              </div>

              <p className="text-xs sm:text-sm text-[#2D3748] leading-relaxed">
                {selectedArticle.content}
              </p>

              <div className="pt-3 border-t border-[#E2E8F0] flex justify-end">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="btn-secondary text-xs"
                >
                  Tutup Artikel
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </section>
  );
}
