"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  Lock,
  ArrowLeft,
  LogIn,
  Eye,
  EyeOff,
  Building2,
} from "lucide-react";

function LppmLoginContent() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/session?role=lppm")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.session && data.session.role === "lppm") {
          router.push("/lppm");
        }
      })
      .catch(() => {});
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.username.trim() || !formData.password.trim()) {
      setErrorMessage("Mohon isi Username dan Password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/lppm/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password.trim(),
        }),
      });

      let data: { success?: boolean; error?: string } = {};
      try { data = await res.json(); } catch {}

      if (res.status === 429) {
        setErrorMessage("Terlalu banyak percobaan login. Tunggu 1 menit lalu coba lagi.");
        setIsSubmitting(false);
        return;
      }
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Otentikasi LPPM gagal.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      router.push("/lppm");
    } catch (err) {
      console.error("LPPM login API error", err);
      setErrorMessage("Gagal terhubung ke server. Coba lagi.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A202C] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="btn-secondary text-xs shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#0F5132]" />
            <span>Kembali ke Portal Utama</span>
          </Link>
          <span className="badge-academic text-[10px] uppercase font-bold tracking-wider">
            PORTAL LPPM
          </span>
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-[#CBD5E1] p-2 shadow-xs mb-2">
            <Image
              src="/images/logo.png"
              alt="Logo Universitas Almuslim"
              width={56}
              height={56}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-extrabold text-[#1A202C] tracking-tight">
            Login LPPM Universitas Almuslim
          </h1>
          <p className="text-xs text-[#4A5568]">
            Pusat Monitoring Kuliah Kerja Masyarakat (KKM)
          </p>
        </div>

        <div className="academic-card p-6 sm:p-8 rounded-xl bg-white border border-[#E2E8F0] shadow-md space-y-6">
          
          <div className="flex items-center gap-2 pb-4 border-b border-[#E2E8F0]">
            <Building2 className="w-5 h-5 text-[#0F5132]" />
            <h2 className="text-sm font-bold text-[#1A202C] uppercase tracking-wider">
              Otentikasi LPPM
            </h2>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#2D3748] mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#0F5132]" />
                Username LPPM *
              </label>
              <input
                type="text"
                required
                placeholder="Masukkan username lppm..."
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#2D3748] mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#0F5132]" />
                Password LPPM *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Masukkan password..."
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-md academic-input text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718096] hover:text-[#1A202C]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3 text-xs justify-center cursor-pointer font-bold shadow-sm"
              >
                <LogIn className="w-4 h-4 text-white" />
                <span>{isSubmitting ? "Memverifikasi..." : "Masuk Dashboard LPPM"}</span>
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-[#E2E8F0]">
            <div className="text-center text-[11px] text-[#718096]">
              Hanya akun resmi <strong>LPPM Universitas Almuslim</strong> yang dapat mengakses monitoring terpadu gampong, mahasiswa, laporan & DPL.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LppmLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F9FA] text-[#1A202C] flex items-center justify-center">Memuat Form Login LPPM...</div>}>
      <LppmLoginContent />
    </Suspense>
  );
}
