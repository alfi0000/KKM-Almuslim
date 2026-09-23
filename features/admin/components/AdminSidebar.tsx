"use client";

import { LayoutDashboard, BookOpen, FileText, MapPin, Users, Newspaper, FolderKanban, CalendarClock, ChevronLeft, ChevronRight, LogOut, X } from "lucide-react";
import type { AdminTab } from "../types";

const SIDEBAR_ITEMS: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
  { id: "overview", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: "mahasiswaKKM", label: "Mahasiswa KKM", icon: <Users className="w-5 h-5" /> },
  { id: "logbook", label: "Logbook Digital", icon: <BookOpen className="w-5 h-5" /> },
  { id: "laporan", label: "Berkas Laporan", icon: <FileText className="w-5 h-5" /> },
  { id: "gampong", label: "Gampong & Posko", icon: <MapPin className="w-5 h-5" /> },
  { id: "dpl", label: "Akun DPL", icon: <Users className="w-5 h-5" /> },
  { id: "berita", label: "Berita & Pengumuman", icon: <Newspaper className="w-5 h-5" /> },
  { id: "dokumen", label: "Dokumen Unduhan", icon: <FolderKanban className="w-5 h-5" /> },
  { id: "jadwal", label: "Jadwal Timeline", icon: <CalendarClock className="w-5 h-5" /> },
  { id: "pengumuman", label: "Pengumuman Hero", icon: <FileText className="w-5 h-5" /> },
];

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (t: AdminTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (v: boolean) => void;
  stats: Record<string, number>;
  session: { nama?: string; role?: string } | null;
  onLogout: () => void;
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  stats,
  session,
  onLogout,
}: AdminSidebarProps) {
  const badgeMap: Record<AdminTab, number> = {
    overview: 0,
    verify: 0,
    mahasiswaKKM: stats.belumTerverifikasi || 0,
    logbook: stats.totalLogbook || 0,
    laporan: stats.totalLaporan || 0,
    gampong: stats.totalGampong || 0,
    dpl: stats.totalDpl || 0,
    berita: stats.totalBerita || 0,
    dokumen: 0,
    jadwal: 0,
    pengumuman: 0,
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] md:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-dvh w-[min(18rem,88vw)] border-r border-[#E2E8F0] bg-white shadow-xl transition-all duration-300 md:h-screen md:shadow-none ${
          isCollapsed ? "md:w-20" : "md:w-64"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        aria-label="Navigasi admin"
      >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#E2E8F0]">
          <span className={`flex min-w-0 items-center gap-2 ${isCollapsed ? "md:hidden" : ""}`}>
              <span className="w-8 h-8 rounded-lg bg-[#0F5132] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </span>
              <span className="font-extrabold text-[#0F5132] text-lg">SIKKMA <span className="text-[11px] font-bold text-[#718096]">Almuslim</span></span>
          </span>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="rounded-lg p-2 text-[#4A5568] transition-colors hover:bg-[#F1F5F9] md:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden p-2 rounded-lg hover:bg-[#F1F5F9] text-[#4A5568] transition-colors md:block"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1" role="navigation" aria-label="Admin navigation">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const badge = badgeMap[item.id];
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[#0F5132] text-white shadow-sm"
                    : "text-[#4A5568] hover:bg-[#F1F5F9] hover:text-[#1A202C]"
                } ${isCollapsed ? "md:justify-center" : ""}`}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className={`flex-1 text-left ${isCollapsed ? "md:hidden" : ""}`}>{item.label}</span>
                    {badge > 0 && (
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${isCollapsed ? "md:hidden" : ""} ${
                        isActive ? "bg-white/20 text-white" : "bg-[#E6F4EA] text-[#0F5132]"
                      }`}>
                        {badge}
                      </span>
                    )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#E2E8F0]">
          {session?.nama && (
            <div className={`flex items-center gap-3 px-2 py-2 mb-2 ${isCollapsed ? "md:justify-center md:px-0" : ""}`}>
              <div className="w-8 h-8 rounded-full bg-[#0F5132] text-white flex items-center justify-center font-bold text-sm">
                {session.nama.charAt(0).toUpperCase()}
              </div>
              <div className={`flex-1 min-w-0 ${isCollapsed ? "md:hidden" : ""}`}>
                <p className="text-xs font-semibold text-[#1A202C] truncate">{session.nama}</p>
                <p className="text-[10px] text-[#718096] capitalize">{session.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#E53E3E] hover:bg-[#FED7D7] transition-colors ${isCollapsed ? "md:justify-center" : ""}`}
            title={isCollapsed ? "Keluar" : undefined}
          >
            <LogOut className="w-5 h-5" />
            <span className={isCollapsed ? "md:hidden" : ""}>Keluar</span>
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
