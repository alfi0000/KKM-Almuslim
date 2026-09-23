"use client";

import {
  LayoutDashboard,
  MapPin,
  Users,
  FileText,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Building2,
} from "lucide-react";

export type LppmTab = "dashboard" | "gampong" | "mahasiswa" | "laporan" | "dpl";

const SIDEBAR_ITEMS: Array<{ id: LppmTab; label: string; icon: React.ReactNode }> = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: "gampong", label: "Monitoring Gampong", icon: <MapPin className="w-5 h-5" /> },
  { id: "mahasiswa", label: "Daftar Mahasiswa", icon: <Users className="w-5 h-5" /> },
  { id: "laporan", label: "Rekap Laporan", icon: <FileText className="w-5 h-5" /> },
  { id: "dpl", label: "Daftar DPL", icon: <UserCheck className="w-5 h-5" /> },
];

interface LppmSidebarProps {
  activeTab: LppmTab;
  setActiveTab: (t: LppmTab) => void;
  stats: { gampong: number; mahasiswa: number; laporan: number; dpl: number };
  session: { nama?: string; username?: string } | null;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (v: boolean) => void;
  onLogout: () => void;
}

export default function LppmSidebar({
  activeTab,
  setActiveTab,
  stats,
  session,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  onLogout,
}: LppmSidebarProps) {
  const badgeMap: Record<LppmTab, number> = {
    dashboard: 0,
    gampong: stats.gampong,
    mahasiswa: stats.mahasiswa,
    laporan: stats.laporan,
    dpl: stats.dpl,
  };

  return (
    <>
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
                  <Building2 className="w-5 h-5 text-white" />
                </span>
                <span className="font-extrabold text-[#0F5132] text-[15px] leading-none truncate">LPPM<span className="ml-1 text-[11px] font-bold text-[#718096]">UMuslim</span></span>
              </span>
            {isCollapsed && (
              <span className="w-9 h-9 rounded-lg bg-[#0F5132] hidden md:flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-white" />
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
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1" role="navigation" aria-label="Navigasi LPPM">
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
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
                <div className="w-8 h-8 rounded-full bg-[#0F5132] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {session.nama.charAt(0).toUpperCase()}
                </div>
                <div className={`flex-1 min-w-0 ${isCollapsed ? "md:hidden" : ""}`}>
                  <p className="text-xs font-semibold text-[#1A202C] truncate">{session.nama}</p>
                  <p className="text-[10px] text-[#718096] truncate">@{session.username}</p>
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
