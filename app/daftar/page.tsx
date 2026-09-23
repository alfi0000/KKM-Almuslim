"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  Hash,
  Lock,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  LogIn,
  UserPlus,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  Phone,
  Send,
  Shield,
  RefreshCw,
} from "lucide-react";
import { getErrorMessage } from "@/lib/client-error";

function DaftarFormContent() {
  const router = useRouter();

  // Auth States
  const [authMode, setAuthMode] = useState<"register" | "login">("register");

  // Password Visibility Toggle
  const [showPassword, setShowPassword] = useState(false);

  // Form Register: nama, npm, noHp (telegram), password
  const [regForm, setRegForm] = useState({
    nama: "",
    npm: "",
    noHp: "",
    password: "",
  });

  // Form Login (npm, password)
  const [loginForm, setLoginForm] = useState({
    npm: "",
    password: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // OTP States
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpIdentifier, setOtpIdentifier] = useState(""); // normalized phone
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSuccess, setOtpSuccess] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    fetch("/api/auth/session?role=mahasiswa")
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.session) return;

        const s = data.session;
        if (s.role === "mahasiswa" && s.npm) {

          fetch(`/api/mahasiswa/biodata?npm=${encodeURIComponent(s.npm)}`)
            .then((res) => res.json())
            .then((profileData) => {
              if (profileData.success && (profileData.profile?.tempatLahir || profileData.profile?.kkmSemester)) {
                // sudah mengisi biodata pendaftaran -> ke dashboard
                router.push("/mahasiswa");
              }
            })
            .catch(() => {});
        }
      })
      .catch((e) => {
        console.error("Error reading session", e);
      });
  }, [router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Handle Buat Akun -> Request OTP via Telegram
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setOtpError("");
    setOtpSuccess("");

    if (!regForm.nama.trim() || !regForm.npm.trim() || !regForm.noHp.trim() || !regForm.password.trim()) {
      setErrorMessage("Mohon lengkapi Nama, NPM, Nomor HP Telegram, dan Password terlebih dahulu.");
      return;
    }

    if (!/^\d{5,20}$/.test(regForm.npm.trim())) {
      setErrorMessage("Format NPM tidak valid (5-20 digit angka).");
      return;
    }

    if (regForm.password.length < 12 || regForm.password.length > 128) {
      setErrorMessage("Password harus terdiri dari 12–128 karakter.");
      return;
    }

    const phoneDigits = regForm.noHp.replace(/\D/g, "");
    if (phoneDigits.length < 9 || phoneDigits.length > 15) {
      setErrorMessage("Format Nomor HP Telegram tidak valid. Contoh: 081234567890");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: regForm.nama.trim(),
          npm: regForm.npm.trim(),
          noHp: regForm.noHp.trim(),
          phone: regForm.noHp.trim(),
          password: regForm.password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Gagal mengirim OTP.");
        setIsSubmitting(false);
        return;
      }

      setOtpIdentifier(data.identifier || regForm.noHp.trim());
      setDevOtp(data.otp || data.devOtp || null);
      setShowOtpStep(true);
      setOtpValue("");
      setSuccessMessage(data.message || "Kode OTP telah dikirim ke Telegram.");
      setResendCooldown(60);
      setIsSubmitting(false);
    } catch (e) {
      console.error("API error", e);
      setErrorMessage(getErrorMessage(e, "Pembuatan akun gagal. Silakan coba lagi."));
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setOtpSuccess("");
    if (!otpValue.trim() || otpValue.trim().length < 4) {
      setOtpError("Masukkan kode OTP 6 digit yang diterima di Telegram.");
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noHp: otpIdentifier || regForm.noHp.trim(),
          phone: otpIdentifier || regForm.noHp.trim(),
          identifier: otpIdentifier || regForm.noHp.trim(),
          otp: otpValue.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setOtpError(data.error || "Verifikasi OTP gagal.");
        setIsVerifyingOtp(false);
        return;
      }
      setOtpSuccess("Verifikasi berhasil! Mengalihkan ke halaman pendaftaran...");
      setIsVerifyingOtp(false);
      setTimeout(() => {
        router.push("/pendaftaran");
      }, 800);
    } catch (e) {
      console.error("OTP verify error", e);
      setOtpError(getErrorMessage(e, "Gagal verifikasi OTP."));
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: regForm.nama.trim(),
          npm: regForm.npm.trim(),
          noHp: regForm.noHp.trim(),
          phone: regForm.noHp.trim(),
          password: regForm.password.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setOtpError(data.error || "Gagal mengirim ulang OTP.");
        setIsSubmitting(false);
        return;
      }
      setDevOtp(data.otp || data.devOtp || null);
      setResendCooldown(60);
      setOtpSuccess("Kode OTP baru telah dikirim ke Telegram.");
      setIsSubmitting(false);
    } catch (e) {
      setOtpError(getErrorMessage(e, "Gagal mengirim ulang OTP."));
      setIsSubmitting(false);
    }
  };

  // Handle Login via Backend API
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!loginForm.npm.trim() || !loginForm.password.trim()) {
      setErrorMessage("Mohon isi NPM dan Password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npm: loginForm.npm.trim(),
          password: loginForm.password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Login gagal. Periksa NPM dan Password Anda.");
        setIsSubmitting(false);
        return;
      }

      const sudahBiodata =
        data.profile && (data.profile.tempatLahir || data.profile.kkmSemester || data.profile.alamatSekarang);

      setSuccessMessage(
        sudahBiodata
          ? "Login berhasil! Mengalihkan ke dashboard..."
          : "Login berhasil! Mengalihkan ke pendaftaran biodata..."
      );
      setIsSubmitting(false);
      setTimeout(() => {
        router.push(sudahBiodata ? "/mahasiswa" : "/pendaftaran");
      }, 600);
    } catch (e) {
      console.error("API login error", e);
      setErrorMessage("Login gagal. Silakan coba lagi.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A202C] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
          <Link
            href="/"
            className="btn-secondary text-xs shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#0F5132]" />
            <span>Kembali ke Beranda Utama</span>
          </Link>

          <div className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="Logo UMuslim" width={32} height={32} className="object-contain" />
            <span className="text-xs font-bold text-[#1A202C] hidden sm:inline">LPPM Universitas Almuslim</span>
          </div>
        </div>

        {/* Step Flow Indicator */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between max-w-2xl mx-auto relative">

            {/* Step 1 Indicator */}
            <div className="flex items-center gap-3 z-10">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${showOtpStep ? "bg-[#0F5132] text-white" : "bg-[#0F5132] text-white ring-4 ring-[#E6F4EA]"}`}>
                1
              </div>
              <div>
                <span className="block text-xs font-bold text-[#1A202C]">Langkah 1</span>
                <span className="text-[11px] text-[#718096]">Buat Akun</span>
              </div>
            </div>

            {/* Connecting Line */}
            <div className="flex-1 mx-4 h-0.5 bg-[#E2E8F0]" />

            {/* Step 2 Indicator */}
            <div className="flex items-center gap-3 z-10">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${showOtpStep ? "bg-[#F1F5F9] text-[#718096] border border-[#CBD5E1]" : "bg-[#F1F5F9] text-[#718096] border border-[#CBD5E1]"}`}>
                2
              </div>
              <div>
                <span className="block text-xs font-bold text-[#1A202C]">Langkah 2</span>
                <span className="text-[11px] text-[#718096]">Verifikasi OTP</span>
              </div>
            </div>

            <div className="flex-1 mx-4 h-0.5 bg-[#E2E8F0] hidden sm:block" />

            <div className="hidden sm:flex items-center gap-3 z-10 opacity-60">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs bg-[#F1F5F9] text-[#718096] border border-[#CBD5E1]">
                3
              </div>
              <div>
                <span className="block text-xs font-bold text-[#1A202C]">Langkah 3</span>
                <span className="text-[11px] text-[#718096]">Pendaftaran</span>
              </div>
            </div>

          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <span className="font-bold">Error:</span> {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        
        {/* BUAT AKUN: REGISTER & LOGIN */}
        <div className="academic-card p-6 sm:p-8 rounded-xl bg-white border border-[#E2E8F0] space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-5">
            <div>
              <div className="badge-academic inline-flex items-center gap-1.5 mb-2">
                <ShieldCheck className="w-4 h-4 text-[#0F5132]" />
                <span>Akun Mahasiswa KKM</span>
              </div>
              <h1 className="text-2xl font-extrabold text-[#1A202C]">
                {authMode === "register" ? (showOtpStep ? "Verifikasi OTP Telegram" : "Buat Akun Mahasiswa KKM") : "Login Mahasiswa KKM"}
              </h1>
              <p className="text-xs text-[#4A5568] mt-1">
                {authMode === "register"
                  ? showOtpStep
                    ? "Masukkan kode OTP yang dikirim ke Telegram Anda untuk mengaktifkan akun."
                    : "Isi Nama, NPM, Nomor HP Telegram, dan Password untuk membuat akun. OTP akan dikirim via Telegram."
                  : "Masuk dengan NPM dan Password akun yang sudah terdaftar."}
              </p>
            </div>

            {/* Mode Switch Tabs */}
            {!showOtpStep && (
            <div className="flex bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0] shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setErrorMessage("");
                }}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  authMode === "register"
                    ? "bg-white text-[#0F5132] shadow-xs"
                    : "text-[#718096] hover:text-[#1A202C]"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Buat Akun</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setErrorMessage("");
                }}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  authMode === "login"
                    ? "bg-white text-[#0F5132] shadow-xs"
                    : "text-[#718096] hover:text-[#1A202C]"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            </div>
            )}
          </div>

          {/* OTP STEP */}
          {showOtpStep && authMode === "register" ? (
            <div className="space-y-4">
              <div className="bg-[#E6F4EA]/40 border border-[#B7E1CD] p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0F5132]">
                  <Send className="w-4 h-4" />
                  <span>Kode OTP Dikirim via Telegram</span>
                </div>
                <p className="text-xs text-[#2D3748] leading-relaxed">
                  Kami telah mengirim kode OTP 6 digit ke Telegram nomor <strong>{regForm.noHp}</strong> ({otpIdentifier ? `https://wa.me/${otpIdentifier.replace(/\D/g,"").replace(/^0/,"62")}` : ""}) 
                  <br />Silakan buka Telegram dan masukkan kodenya di bawah. Berlaku 5 menit.
                </p>
                {devOtp && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-xs">
                    <span className="font-bold text-amber-800">DEV OTP (testing): </span>
                    <code className="font-mono text-sm font-bold text-[#0F5132] tracking-widest">{devOtp}</code>
                    <span className="text-[11px] text-[#718096] ml-2">(hanya muncul di development / jika Telegram gagal)</span>
                  </div>
                )}
              </div>

              {otpError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">{otpError}</div>
              )}
              {otpSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{otpSuccess}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2D3748] mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#0F5132]" />
                    Kode OTP (6 digit) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    placeholder="Masukkan 6 digit OTP"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0,6))}
                    className="w-full px-3.5 py-3 rounded-md academic-input text-center text-lg tracking-[0.4em] font-mono font-bold"
                  />
                  <p className="text-[11px] text-[#718096] mt-1.5">OTP dikirim via Telegram Bot. Pastikan Anda telah memulai chat dengan bot Telegram yang terkonfigurasi.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOtpStep(false);
                      setOtpValue("");
                      setOtpError("");
                      setOtpSuccess("");
                    }}
                    className="btn-secondary flex-1 py-3 text-xs justify-center"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingOtp}
                    className="btn-primary flex-1 py-3 text-xs justify-center font-bold shadow-xs disabled:opacity-50"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Memverifikasi...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 text-white" />
                        <span>Verifikasi & Buat Akun</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isSubmitting}
                    className="text-xs text-[#0F5132] font-semibold hover:underline disabled:text-[#A0AEC0] disabled:no-underline"
                  >
                    {resendCooldown > 0 ? `Kirim ulang dalam ${resendCooldown}s` : "Kirim ulang OTP"}
                  </button>
                </div>
              </form>
            </div>
          ) : authMode === "register" ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="bg-[#E6F4EA]/40 border border-[#B7E1CD] p-3 rounded-md text-[11px] text-[#0F5132] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0F5132] shrink-0" />
                <span>Pembuatan akun membutuhkan <b>Nama</b>, <b>NPM</b>, <b>Nomor HP Telegram</b>, dan <b>Password</b>. Kode OTP akan dikirim via Telegram untuk verifikasi.</span>
              </div>

              {/* 1. Nama Lengkap */}
              <div>
                <label className="block text-xs font-semibold text-[#2D3748] mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#0F5132]" />
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                                    placeholder="Contoh: Rahmat Hidayat"
                  value={regForm.nama}
                  onChange={(e) => setRegForm({ ...regForm, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>

              {/* 2. NPM */}
              <div>
                <label className="block text-xs font-semibold text-[#2D3748] mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-[#0F5132]" />
                  Nomor Pokok Mahasiswa (NPM) *
                </label>
                <input
                  type="text"
                  required
                                    placeholder="Contoh: 210610015"
                  value={regForm.npm}
                  onChange={(e) => setRegForm({ ...regForm, npm: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>

              {/* 3. Nomor HP Telegram */}
              <div>
                <label className="block text-xs font-semibold text-[#2D3748] mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#0F5132]" />
                  Nomor HP (Telegram) *
                </label>
                <input
                  type="tel"
                  required
                                    placeholder="Contoh: 081234567890 (terdaftar Telegram)"
                  value={regForm.noHp}
                  onChange={(e) => setRegForm({ ...regForm, noHp: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs disabled:bg-gray-50 disabled:text-gray-400"
                />
                <p className="text-[10px] text-[#718096] mt-1">Pastikan nomor terdaftar di Telegram dan sudah memulai chat dengan bot.</p>
              </div>

              {/* 4. Password */}
              <div>
                <label className="block text-xs font-semibold text-[#2D3748] mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#0F5132]" />
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                                        placeholder="Minimal 12 karakter..."
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-md academic-input text-xs disabled:bg-gray-50 disabled:text-gray-400"
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
                  className="btn-primary w-full py-3 text-xs justify-center cursor-pointer font-bold shadow-xs disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 text-white" />
                  <span>{isSubmitting ? "Mengirim OTP..." : "Daftar & Kirim OTP"}</span>
                  <ArrowRight className="w-4 h-4 text-white ml-1" />
                </button>
              </div>
            </form>
          ) : (
            /* FORM LOGIN */
            <form onSubmit={handleLogin} className="space-y-4">
              {/* NPM */}
              <div>
                <label className="block text-xs font-semibold text-[#2D3748] mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-[#0F5132]" />
                  Nomor Pokok Mahasiswa (NPM) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan NPM Anda..."
                  value={loginForm.npm}
                  onChange={(e) => setLoginForm({ ...loginForm, npm: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-md academic-input text-xs"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-[#2D3748] mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#0F5132]" />
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Masukkan password Anda..."
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
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
                  className="btn-primary w-full py-3 text-xs justify-center cursor-pointer font-bold shadow-xs"
                >
                  <LogIn className="w-4 h-4 text-white" />
                  <span>{isSubmitting ? "Memproses..." : "Login"}</span>
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}

export default function DaftarPage() {
  return <DaftarFormContent />;
}
