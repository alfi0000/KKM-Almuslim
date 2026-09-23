"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Menu,
  X,
  Phone,
  Mail,
  FileEdit,
  ShieldCheck,
  Globe,
} from "lucide-react";
import site from "@/lib/site.json";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Beranda", href: "/#beranda" },
    { name: "Tentang KKM", href: "/#tentang" },
    { name: "Program KKM", href: "/#program" },
    { name: "Sebaran Gampong", href: "/#sebaran" },
    { name: "Jadwal & Timeline", href: "/#jadwal" },
    { name: "Berita & Pengumuman", href: "/#berita" },
    { name: "Unduhan Dokumen", href: "/#unduhan" },
    { name: "FAQ", href: "/#faq" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#dce7df] bg-white/95 shadow-[0_8px_30px_-24px_rgba(7,54,40,0.6)] backdrop-blur transition-all duration-200">
      
      {/* Top Academic Utility Bar */}
      <div className="bg-[#0b4938] text-white text-[11px] py-2 px-4 sm:px-6 hidden sm:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#e7c77e]" />
              {site.site.portalLabel}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-100">
              <Phone className="w-3.5 h-3.5 text-[#e7c77e]" />
              Sekretariat: {site.site.phone}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-100">
              <Mail className="w-3.5 h-3.5 text-[#e7c77e]" />
              {site.site.email}
            </span>
          </div>

          <div className="flex items-center gap-4 text-emerald-100">
            <a
              href={site.site.website}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <Globe className="w-3 h-3" /> Kampus
            </a>
          </div>
        </div>
      </div>

      {/* Main Official Header Navigation */}
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-200 ${scrolled ? "py-2.5" : "py-4"}`}>
        <div className="flex items-center justify-between">
          
          {/* Official Logo Brand Identity */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-12 h-12 flex items-center justify-center shrink-0 rounded-full bg-[#f7f3e8] ring-1 ring-[#ead9ae]">
              <Image
                src={site.site.logo}
                alt={site.site.logoAlt}
                width={44}
                height={44}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col border-l border-[#d6e1da] pl-3">
              <span className="font-extrabold text-base tracking-tight text-[#16342a] leading-tight">
                {site.site.univName}
              </span>
              <span className="text-[10px] font-bold text-[#a67828] tracking-[0.12em] uppercase">
                {site.site.tagline}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="px-3 py-2 text-xs font-semibold text-[#53655d] hover:text-[#0d5c46] hover:bg-[#eff5ef] rounded-full transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Action CTA Button: Single "Daftar KKM" Button */}
          <div className="hidden lg:flex items-center gap-2">
            <Link
              href="/daftar"
              className="btn-primary text-xs py-2.5 px-4 shadow-[0_8px_18px_-10px_rgba(13,92,70,0.75)]"
            >
              <FileEdit className="w-3.5 h-3.5 text-white" />
              Daftar KKM
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-md bg-[#F1F5F9] text-[#2D3748] hover:text-[#0F5132] border border-[#CBD5E1]"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-white border-t border-[#E2E8F0] py-3 px-4 shadow-md animate-in slide-in-from-top duration-200">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-xs font-semibold text-[#2D3748] hover:bg-[#E6F4EA] hover:text-[#0F5132] rounded-md"
              >
                {link.name}
              </a>
            ))}
            <div className="pt-3 border-t border-[#E2E8F0] flex flex-col gap-2 mt-2">
              <Link
                href="/daftar"
                onClick={() => setMobileMenuOpen(false)}
                className="btn-primary text-xs w-full py-2.5 justify-center"
              >
                <FileEdit className="w-4 h-4 text-white" />
                Formulir Pendaftaran KKM
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
