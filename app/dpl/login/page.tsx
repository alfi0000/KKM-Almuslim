"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  UserCheck,
  Lock,
  ArrowLeft,
  LogIn,
  Eye,
  EyeOff,
  Hash,
} from "lucide-react";

function DplLoginContent() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Auto redirect if already logged in
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.session) {
          router.push("/dpl");
        }
      })
      .catch(() => {});
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.username.trim() || !formData.password.trim()) {
      setErrorMessage("Mohon isi NIDN / Username dan Password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/dpl/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nidn: formData.username.trim(),
          password: formData.password.trim(),
        }),
      });

      let data: { success?: boolean; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Respons bukan JSON (mis. 429/HTML dari proxy)
      }

      if (res.status === 429) {
        setErrorMessage("Terlalu banyak percobaan login. Tunggu 1 menit lalu coba lagi.");
        return;
      }
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Login DPL gagal. Periksa NIDN dan Password.");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      router.push("/dpl");
    } catch (err) {
      console.error("DPL login API error", err);
      setErrorMessage("Gagal terhubung ke server. Coba lagi.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A202C] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="btn-secondary text-xs shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#0F5132]" />
            <span>Kembali ke Portal Utama</span>
          </Link>
          <span className="badge-academic text-[10px] uppercase font-bold tracking-wider">
            PORTAL DOSEN DPL
          </span>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-[#CBD5E1] p-2 shadow-xs mb-2">
            <Image
              src="/images/logo.png"
              alt="Logo Universitas Almuslim"
              width={56}
              height={56}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-extrabold text-[#1A202C] tracking-tight">
            Login Admin / DPL KKM
          </h1>
          <p className="text-xs text-[#4A5568]">
            Portal Pembimbingan Lapangan & Verifikasi Logbook Mahasiswa
          </p>
        </div>

        {/* Main Card Login */}
        <div className="academic-card p-6 sm:p-8 rounded-xl bg-white border border-[#E2E8F0] shadow-md space-y-6">
          
          <div className="flex items-center gap-2 pb-4 border-b border-[#E2E8F0]">
            <UserCheck className="w-5 h-5 text-[#0F5132]" />
            <h2 className="text-sm font-bold text-[#1A202C] uppercase tracking-wider">
              Otentikasi Dosen Pembimbing Lapangan
            </h2>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* NIDN / Username */}
            <div>
              <label className="block text-xs font-semibold text-[#2D3748] mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-[#0F5132]" />
                NIDN / Username Dosen *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: 0012057801..."
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-[#2D3748] mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#0F5132]" />
                Password DPL *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Masukkan password DPL Anda..."
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

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3 text-xs justify-center cursor-pointer font-bold shadow-sm"
              >
                <LogIn className="w-4 h-4 text-white" />
                <span>{isSubmitting ? "Memverifikasi..." : "Masuk Portal DPL"}</span>
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-[#E2E8F0] text-center text-[11px] text-[#718096]">
            Halaman ini diperuntukkan khusus bagi Dosen Pembimbing Lapangan (DPL) Universitas Almuslim untuk peninjauan logbook dan pembimbingan mahasiswa.
          </div>
        </div>

      </div>
    </div>
  );
}

export default function DplLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F9FA] text-[#1A202C] flex items-center justify-center">Memuat Form Login DPL...</div>}>
      <DplLoginContent />
    </Suspense>
  );
}
