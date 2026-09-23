"use client";

import Image from "next/image";
import {
  LayoutDashboard,
  BookOpen,
  FileCheck,
  Users,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
} from "lucide-react";

export type MahasiswaTab = "dashboard" | "logbook" | "anggota" | "posko" | "laporan" | "kartu";

const SIDEBAR_ITEMS: Array<{ id: MahasiswaTab; label: string; icon: React.ReactNode }> = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: "logbook", label: "Logbook Digital", icon: <BookOpen className="w-5 h-5" /> },
  { id: "anggota", label: "Anggota Kelompok", icon: <Users className="w-5 h-5" /> },
  { id: "laporan", label: "Berkas Laporan", icon: <FileCheck className="w-5 h-5" /> },
  { id: "kartu", label: "Kartu Peserta KKM", icon: <GraduationCap className="w-5 h-5" /> },
];

interface MahasiswaSidebarProps {
  activeTab: MahasiswaTab;
  setActiveTab: (t: MahasiswaTab) => void;
  stats: { logbook: number; laporan: number };
  session: { nama?: string; npm?: string; foto?: string } | null;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (v: boolean) => void;
  onLogout: () => void;
  isVerified?: boolean;
}

export default function MahasiswaSidebar({
  activeTab,
  setActiveTab,
  stats,
  session,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  onLogout,
  isVerified = true,
}: MahasiswaSidebarProps) {
  const badgeMap: Record<MahasiswaTab, number> = {
    dashboard: 0,
    logbook: stats.logbook,
    anggota: 0,
    posko: 0,
    laporan: stats.laporan,
    kartu: 0,
  };
  const isTabDisabled = (id: MahasiswaTab) => id !== "dashboard" && !isVerified;

  const mhsNama = session?.nama || "";
  const mhsNpm = session?.npm || "";

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-dvh w-[min(18rem,88vw)] bg-white border-r border-[#E2E8F0] z-50 shadow-xl md:h-screen md:shadow-none transition-all duration-300 ${
          isCollapsed ? "md:w-20" : "md:w-64"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`flex items-center justify-between h-16 px-4 border-b border-[#E2E8F0] ${isCollapsed ? "md:justify-center md:px-2" : ""}`}>
              <span className={`flex items-center gap-2 min-w-0 ${isCollapsed ? "md:hidden" : ""}`}>
                <span className="w-8 h-8 rounded-lg bg-[#0F5132] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                </span>
                <span className="font-extrabold text-[#0F5132] text-lg truncate">SIKKMA Almuslim</span>
              </span>
            {isCollapsed && (
              <span className="w-9 h-9 rounded-lg bg-[#0F5132] hidden md:flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </span>
            )}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#4A5568] transition-colors md:hidden"
              aria-label="Tutup menu"
            >
              <X className="w-5 h-5" />
            </button>
            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#4A5568] transition-colors hidden md:block"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
          </div>
          {isCollapsed && (
            <button
              onClick={() => setIsCollapsed(false)}
              className="hidden md:flex mx-auto mt-3 p-2 rounded-lg hover:bg-[#F1F5F9] text-[#4A5568] transition-colors"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1" role="navigation" aria-label="Navigasi portal mahasiswa">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              const badge = badgeMap[item.id];
              const disabled = isTabDisabled(item.id);
              return (
                <button
                  key={item.id}
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    setActiveTab(item.id);
                    setIsMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    disabled
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                      : isActive
                      ? "bg-[#0F5132] text-white shadow-sm cursor-pointer"
                      : "text-[#4A5568] hover:bg-[#F1F5F9] hover:text-[#1A202C] cursor-pointer"
                  } ${isCollapsed ? "md:justify-center" : ""}`}
                  title={disabled ? `${item.label} - Menunggu verifikasi seluruh berkas` : isCollapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                      <span className={`flex-1 text-left ${isCollapsed ? "md:hidden" : ""}`}>{item.label}</span>
                      {disabled ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 font-bold ${isCollapsed ? "md:hidden" : ""}`}>🔒</span>
                      ) : badge > 0 ? (
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${isCollapsed ? "md:hidden" : ""} ${
                          isActive ? "bg-white/20 text-white" : "bg-[#E6F4EA] text-[#0F5132]"
                        }`}>
                          {badge}
                        </span>
                      ) : null}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-[#E2E8F0]">
            {(mhsNama || mhsNpm) && (
              <div className={`flex items-center gap-3 px-2 py-2 mb-2 ${isCollapsed ? "md:justify-center md:px-0" : ""}`}>
                {session?.foto ? (
                  <Image
                    src={session.foto}
                    alt={`Foto ${mhsNama || "Mahasiswa"}`}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover border border-[#E2E8F0] shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#0F5132] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {mhsNama.charAt(0).toUpperCase() || "M"}
                  </div>
                )}
                  <div className={`flex-1 min-w-0 ${isCollapsed ? "md:hidden" : ""}`}>
                    <p className="text-xs font-semibold text-[#1A202C] truncate">{mhsNama}</p>
                    <p className="text-[10px] text-[#718096] truncate">NPM: {mhsNpm || "-"}</p>
                  </div>
              </div>
            )}
            <button
              onClick={onLogout}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#E53E3E] hover:bg-[#FED7D7] transition-colors cursor-pointer ${isCollapsed ? "md:justify-center" : ""}`}
              title={isCollapsed ? "Keluar" : undefined}
            >
              <LogOut className="w-5 h-5" />
              <span className={isCollapsed ? "md:hidden" : ""}>Keluar / Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
