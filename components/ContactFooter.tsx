"use client";

import { useState } from "react";
import Image from "next/image";
import {
  MapPin,
  Mail,
  Phone,
  Send,
  CheckCircle2,
  ArrowUp,
  Building,
  Loader2,
} from "lucide-react";
import site from "@/lib/site.json";
import { getErrorMessage } from "@/lib/client-error";

export default function ContactFooter() {
  const [formSent, setFormSent] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [formData, setFormData] = useState({
    nama: "",
    email: "",
    peran: "Mahasiswa Peserta",
    pesan: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingForm) return;
    if (!formData.nama.trim() || !formData.pesan.trim()) return;

    setIsSubmittingForm(true);
    setFormError("");
    try {
      const res = await fetch("/api/pengaduan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaPengadu: formData.nama,
          ...(formData.email.includes("@")
            ? { email: formData.email }
            : { telepon: formData.email }),
          kategori: formData.peran,
          judul: `Pesan dari ${formData.peran}: ${formData.nama}`,
          pesan: formData.pesan,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || "Gagal mengirim pesan. Silakan coba lagi.");
        return;
      }
      setFormSent(true);
      setFormData({ nama: "", email: "", peran: "Mahasiswa Peserta", pesan: "" });
      setTimeout(() => setFormSent(false), 6000);
    } catch (err) {
      setFormError(getErrorMessage(err, "Gagal menghubungi server. Periksa koneksi Anda."));
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer id="kontak" className="bg-[#F1F5F9] text-[#1A202C] border-t border-[#CBD5E1] pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10 border-b border-[#CBD5E1]">
          
          {/* Left Campus Info */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white border border-[#CBD5E1] p-1 shadow-xs shrink-0 flex items-center justify-center">
                <Image
                  src={site.site.logo}
                  alt={site.site.logoAlt}
                  width={44}
                  height={44}
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-[#1A202C] tracking-tight">
                  {site.site.univName}
                </h3>
                <p className="text-xs text-[#0F5132] font-bold">
                  {site.site.lppmName}
                </p>
              </div>
            </div>

            <p className="text-[#4A5568] text-xs leading-relaxed max-w-lg">
              {site.site.description}
            </p>

            <div className="space-y-2 text-xs text-[#2D3748]">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-white border border-[#CBD5E1]">
                <MapPin className="w-4 h-4 text-[#0F5132] shrink-0 mt-0.5" />
                <span>
                  {site.site.address}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-[#CBD5E1]">
                  <Mail className="w-4 h-4 text-[#D97706] shrink-0" />
                  <span>{site.site.email}</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-[#CBD5E1]">
                  <Phone className="w-4 h-4 text-[#0F5132] shrink-0" />
                  <span>{site.site.phone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Inquiry Form */}
          <div className="lg:col-span-6 bg-white p-6 rounded-lg border border-[#CBD5E1] shadow-xs">
            <h4 className="text-sm font-bold text-[#1A202C] mb-1 flex items-center gap-2">
              <Building className="w-4 h-4 text-[#0F5132]" />
              Layanan Layanan Pengaduan & Informasi LPPM
            </h4>
            <p className="text-xs text-[#718096] mb-4">
              Kirimkan pertanyaan atau masukan resmi ke Sekretariat LPPM UMuslim.
            </p>

            {formSent ? (
              <div className="p-4 rounded-lg bg-[#E6F4EA] border border-[#B7E1CD] text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-[#0F5132] mx-auto" />
                <h5 className="text-xs font-bold text-[#0F5132]">Pesan Berhasil Terkirim</h5>
                <p className="text-[11px] text-[#2D3748]">
                  Sekretariat LPPM akan memproses pertanyaan Anda secepatnya.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#2D3748] mb-1">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nama Anda..."
                      value={formData.nama}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#2D3748] mb-1">
                      Peran / Status
                    </label>
                    <select
                      value={formData.peran}
                      onChange={(e) => setFormData({ ...formData, peran: e.target.value })}
                      className="w-full px-3 py-2 rounded-md academic-input text-xs bg-white"
                    >
                      <option value="Mahasiswa Peserta">Mahasiswa Peserta</option>
                      <option value="Perangkat Gampong">Perangkat Gampong / Keuchik</option>
                      <option value="Dosen Pembimbing">Dosen Pembimbing (DPL)</option>
                      <option value="Masyarakat Umum">Masyarakat Umum</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#2D3748] mb-1">
                    Kontak Email / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: nama@email.com / 0812xxxxxx (WhatsApp)"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#2D3748] mb-1">
                    Pesan / Pertanyaan *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Tuliskan pesan Anda..."
                    value={formData.pesan}
                    onChange={(e) => setFormData({ ...formData, pesan: e.target.value })}
                    className="w-full px-3 py-2 rounded-md academic-input text-xs"
                  />
                </div>

                {formError && (
                  <div className="p-2.5 rounded-md bg-red-50 border border-red-200 text-[11px] text-red-700 font-medium">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="btn-primary text-xs w-full py-2.5 justify-center cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingForm ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Kirim Pesan Resmi</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#718096]">
          <div>
            © {new Date().getFullYear()} <strong>LPPM Universitas Almuslim Matangglumpangdua</strong>. Hak Cipta Dilindungi.
          </div>

          <button
            onClick={scrollToTop}
            className="btn-secondary text-xs py-1.5 px-3 cursor-pointer"
          >
            <span>Kembali ke Atas</span>
            <ArrowUp className="w-3.5 h-3.5 text-[#0F5132]" />
          </button>
        </div>
      </div>
    </footer>
  );
}
