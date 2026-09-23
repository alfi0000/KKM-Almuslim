"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  QrCode,
  Camera,
  X,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Search,
  User,
  MapPin,
  Building,
  GraduationCap,
  Calendar,
} from "lucide-react";

export default function QrScannerSection() {
  const [activeMode, setActiveMode] = useState<"qr" | "manual">("qr");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualNpm, setManualNpm] = useState("");
  const [html5QrcodeLib, setHtml5QrcodeLib] = useState<any>(null);
  const qrScannerRef = useRef<any>(null);
  const isProcessingRef = useRef(false);

  // Load html5-qrcode library only on client side to prevent Next.js SSR error
  useEffect(() => {
    import("html5-qrcode")
      .then((lib) => {
        setHtml5QrcodeLib(lib);
      })
      .catch((err) => {
        console.error("Failed to load html5-qrcode library:", err);
      });

    // Cleanup scanner on unmount
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current
          .stop()
          .catch((err: any) => console.warn("Failed to stop scanner on unmount:", err));
      }
    };
  }, []);

  const extractNpm = (decodedText: string): string | null => {
    const npm = decodedText.trim();
    if (/^\d{5,20}$/.test(npm)) return npm;
    return null;
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (isProcessingRef.current || loading) return;
    isProcessingRef.current = true;
    const npm = extractNpm(decodedText);
    if (!npm) {
      setError("QR Code tidak valid. Pastikan QR Code berisi NPM mahasiswa.");
      setResult(null);
      await stopScanner();
      isProcessingRef.current = false;
      return;
    }

    setError(null);
    await stopScanner();
    await fetchStudentData(npm);
    isProcessingRef.current = false;
  };

  const startScanner = async () => {
    if (!html5QrcodeLib) {
      setError("Sistem pemindai sedang memuat. Silakan coba sesaat lagi.");
      return;
    }
    setError(null);
    setResult(null);
    setScanning(true);

    try {
      const scanner = new html5QrcodeLib.Html5Qrcode("reader");
      qrScannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (width: number, height: number) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          },
        },
        async (decodedText: string) => {
          await handleScanSuccess(decodedText);
        },
        () => {
          // Fail silently during camera frames scanning
        }
      );
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError("Gagal mengakses kamera. Mohon pastikan izin kamera telah diberikan.");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try {
        await qrScannerRef.current.stop();
        qrScannerRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setScanning(false);
  };

  const fetchStudentData = async (npm: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/verifikasi/${encodeURIComponent(npm)}`);
      const data = await res.json();
      if (data.success && data.profile) {
        setResult(data.profile);
      } else {
        setError("Data mahasiswa tidak ditemukan. Silakan periksa kembali NPM.");
        setResult(null);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Gagal menghubungi server untuk memverifikasi data.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const npm = manualNpm.trim();
    if (!/^\d{5,20}$/.test(npm)) {
      setError("Masukkan NPM yang valid (5-20 digit angka).");
      return;
    }
    fetchStudentData(npm);
  };

  const toggleMode = (mode: "qr" | "manual") => {
    stopScanner();
    setError(null);
    setResult(null);
    setActiveMode(mode);
  };

  return (
    <section id="verifikasi" className="py-16 bg-white border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2 mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F5132] flex items-center justify-center gap-1.5">
            <QrCode className="w-4 h-4 text-[#0F5132]" /> LAYANAN VERIFIKASI
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A202C] tracking-tight">
            Verifikasi Kartu Mahasiswa KKM
          </h2>
          <p className="text-[#4A5568] text-sm leading-relaxed">
            Pindai QR Code atau masukkan NPM pada Kartu Tanda Peserta KKM.
          </p>
        </div>

        <div className="max-w-2xl mx-auto bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-6">
          {/* Mode Switcher */}
          <div className="flex bg-slate-200 p-1 rounded-lg">
            <button
              onClick={() => toggleMode("qr")}
              className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 cursor-pointer transition-all ${
                activeMode === "qr"
                  ? "bg-white text-[#0F5132] shadow-sm"
                  : "text-[#718096] hover:text-[#1A202C]"
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Scan QR Code</span>
            </button>
            <button
              onClick={() => toggleMode("manual")}
              className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center gap-2 cursor-pointer transition-all ${
                activeMode === "manual"
                  ? "bg-white text-[#0F5132] shadow-sm"
                  : "text-[#718096] hover:text-[#1A202C]"
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Masukkan NPM</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* QR Scan Area */}
          {activeMode === "qr" && (
            <div className="flex flex-col items-center justify-center space-y-4">
              {scanning ? (
                <div className="w-full max-w-sm space-y-4">
                  {/* Scanner Container */}
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-slate-300 shadow-inner bg-black">
                    <div id="reader" className="w-full h-full"></div>
                    {/* Floating scanning line */}
                    <div className="absolute inset-x-0 h-0.5 bg-green-500 opacity-70 animate-bounce top-1/4"></div>
                  </div>
                  <button
                    onClick={stopScanner}
                    className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <X className="w-4 h-4" />
                    Hentikan Scanner
                  </button>
                </div>
              ) : (
                <div className="text-center p-8 border border-dashed border-slate-300 rounded-xl bg-white w-full flex flex-col items-center justify-center space-y-3">
                  <div className="p-4 bg-green-50 rounded-full border border-green-100">
                    <Camera className="w-8 h-8 text-[#0F5132]" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800">Gunakan Kamera Perangkat</h4>
                    <p className="text-[11px] text-slate-500 max-w-xs">
                      Izinkan akses kamera browser Anda untuk memindai kode QR yang ada di Kartu KKM.
                    </p>
                  </div>
                  <button
                    onClick={startScanner}
                    className="px-6 py-2.5 bg-[#0F5132] hover:bg-[#0C4128] text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Aktifkan Kamera & Scan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Manual Input Area */}
          {activeMode === "manual" && (
            <form onSubmit={handleManualSearch} className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Masukkan NPM mahasiswa"
                    value={manualNpm}
                    onChange={(e) => setManualNpm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg academic-input text-xs border border-slate-300 bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0C4128] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cari Data"}
                </button>
              </div>
            </form>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-8 h-8 text-[#0F5132] animate-spin" />
              <span className="text-xs text-slate-500 font-semibold">Mengambil data resmi dari database...</span>
            </div>
          )}

          {/* Scan Results Card */}
          {result && !loading && (
            <div className="bg-white border border-[#CBD5E1] rounded-xl p-5 shadow-md space-y-4 animate-fadeIn">
              {/* Verification Header */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-extrabold text-green-800">PESERTA KKM TERVERIFIKASI</h4>
                    <p className="text-[10px] text-green-600 font-medium">Data sesuai dengan rekam akademis LPPM UMuslim</p>
                  </div>
                </div>
                <button
                  onClick={() => setResult(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-full cursor-pointer transition-all"
                  title="Tutup Hasil"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Student Card Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                {/* Photo */}
                <div className="aspect-[3/4] bg-[#F8F9FA] border border-[#E2E8F0] rounded-lg flex items-center justify-center text-center p-2 text-slate-400 overflow-hidden relative w-full max-w-[140px] mx-auto">
                  {result.foto ? (
                    <Image
                      src={result.foto}
                      alt="Foto Mahasiswa"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="space-y-1">
                      <User className="w-12 h-12 text-[#0F5132] mx-auto" />
                      <div className="text-[9px] font-extrabold text-[#718096]">FOTO 3x4</div>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="sm:col-span-2 space-y-2.5 text-xs text-slate-700">
                  <div className="pb-1.5 border-b border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Nama Lengkap</span>
                    <h3 className="font-extrabold text-sm text-[#1A202C]">{result.nama}</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pb-1.5 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">NPM</span>
                      <p className="font-bold text-[#1A202C]">{result.npm}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Skema KKM</span>
                      <p className="font-bold text-[#0F5132]">{result.program}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pb-1.5 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-0.5">
                        <GraduationCap className="w-3 h-3" /> Akademik
                      </span>
                      <p className="font-medium text-[11px] text-slate-600">{result.prodi}</p>
                      <p className="text-[10px] text-slate-400">{result.fakultas}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" /> Lokasi KKM
                      </span>
                      <p className="font-bold text-[11px] text-[#1A202C]">{result.gampong}</p>
                      <p className="text-[10px] text-slate-500">Kec. {result.kecamatan}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-0.5">
                        <Building className="w-3 h-3" /> Posko & DPL
                      </span>
                      <p className="font-medium text-[11px] text-slate-600">{result.posko}</p>
                      <p className="text-[10px] text-slate-500">DPL: {result.dpl}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-0.5">
                        <Calendar className="w-3 h-3" /> Terdaftar Pada
                      </span>
                      <p className="font-medium text-[11px] text-slate-600">{result.tanggalDaftar}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
