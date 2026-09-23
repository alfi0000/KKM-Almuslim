"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound, X } from "lucide-react";
import { getErrorMessage } from "@/lib/client-error";

interface ChangePasswordDialogProps {
  endpoint: "/api/mahasiswa/password" | "/api/dpl/password";
}

export default function ChangePasswordDialog({ endpoint }: ChangePasswordDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const close = () => {
    if (isSubmitting) return;
    setIsOpen(false);
    setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setMessage("");
    setError("");
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (form.newPassword.length < 12) {
      setError("Password baru minimal 12 karakter.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Konfirmasi password baru tidak sama.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Gagal mengubah password.");
      setMessage("Password berhasil diperbarui.");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (submissionError) {
      setError(getErrorMessage(submissionError, "Gagal mengubah password."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="btn-secondary text-xs cursor-pointer shadow-xs justify-center">
        <KeyRound className="w-4 h-4 text-[#0F5132]" />
        <span>Ganti Password</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
          <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] pb-3">
              <div>
                <h2 id="change-password-title" className="text-base font-extrabold text-[#1A202C]">Ganti Password</h2>
                <p className="mt-1 text-xs text-[#718096]">Gunakan minimal 12 karakter dan jangan bagikan password kepada siapa pun.</p>
              </div>
              <button type="button" onClick={close} disabled={isSubmitting} className="rounded-md p-1 text-[#718096] hover:bg-[#F1F5F9]" aria-label="Tutup">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && <p className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">{error}</p>}
            {message && <p className="rounded-md border border-green-200 bg-green-50 p-2.5 text-xs text-green-700">{message}</p>}

            {[
              ["currentPassword", "Password Saat Ini"],
              ["newPassword", "Password Baru"],
              ["confirmPassword", "Konfirmasi Password Baru"],
            ].map(([field, label]) => (
              <label key={field} className="block text-xs font-semibold text-[#2D3748]">
                {label}
                <div className="relative mt-1.5">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={form[field as keyof typeof form]}
                    onChange={(event) => setForm((previous) => ({ ...previous, [field]: event.target.value }))}
                    autoComplete={field === "currentPassword" ? "current-password" : "new-password"}
                    required
                    minLength={field === "currentPassword" ? 1 : 12}
                    maxLength={128}
                    className="w-full rounded-md border border-[#CBD5E1] py-2.5 pl-3 pr-10 text-sm outline-none focus:border-[#0F5132]"
                  />
                  <button type="button" onClick={() => setShowPasswords((visible) => !visible)} className="absolute inset-y-0 right-0 px-3 text-[#718096]" aria-label={showPasswords ? "Sembunyikan password" : "Tampilkan password"}>
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            ))}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={close} disabled={isSubmitting} className="btn-secondary text-xs py-2 px-4">Batal</button>
              <button type="submit" disabled={isSubmitting} className="btn-primary text-xs py-2 px-4 disabled:opacity-60">
                {isSubmitting ? "Menyimpan..." : "Simpan Password"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
