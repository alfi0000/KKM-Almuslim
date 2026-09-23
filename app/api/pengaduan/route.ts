import { NextRequest, NextResponse } from "next/server";
import { addPengaduan } from "@/lib/db";
import { AppError, handleError } from "@/lib/error";
import { optionalString, readJsonObject, requiredString } from "@/lib/api-validation";
import { optionalTrustedUploadUrl } from "@/lib/validation";
import { sendTelegramMessage, escapeHtml } from "@/lib/telegram";

function normalizeToWaDigits(raw: string): string | null {
  // Hapus semua non-digit (spasi, strip, plus, kurung)
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  let normalized = digits;
  if (normalized.startsWith("0")) {
    normalized = "62" + normalized.slice(1);
  } else if (normalized.startsWith("62")) {
    // sudah format internasional
  } else if (normalized.startsWith("8")) {
    // input tanpa 0, mis. 81234567890 -> 6281234567890
    normalized = "62" + normalized;
  } else {
    return null;
  }
  if (!/^62\d{8,13}$/.test(normalized)) return null;
  return normalized;
}

function toWaMeUrl(rawPhone: string): string | null {
  const digits = normalizeToWaDigits(rawPhone);
  return digits ? `https://wa.me/${digits}` : null;
}

function formatKontakForTelegram(email?: string, telepon?: string): string {
  if (telepon) {
    const waUrl = toWaMeUrl(telepon);
    const escPhone = escapeHtml(telepon);
    if (waUrl) {
      // Tampilkan tautan wa.me yang bisa ditekan langsung di Telegram (HTML)
      // Contoh: 081234567890 -> https://wa.me/628123456789
      return `<a href="${waUrl}">${escapeHtml(waUrl)}</a> (${escPhone})`;
    }
    return escPhone;
  }
  if (email) return escapeHtml(email);
  return "-";
}

export async function POST(req: NextRequest) {
  try {
    const b = await readJsonObject(req, 64_000);
    const namaPengadu = optionalString(b.namaPengadu, "Nama pengadu", 120);
    const email = optionalString(b.email, "Email", 254);
    const telepon = optionalString(b.telepon, "Telepon", 30);
    const kategori = optionalString(b.kategori, "Kategori", 80);
    const judul = requiredString(b.judul, "Judul", 3, 200);
    const pesan = requiredString(b.pesan, "Pesan", 10, 5_000);
    const lampiran = optionalTrustedUploadUrl(b.lampiran, "Lampiran");
    // Kontak boleh berupa email ATAU nomor WhatsApp
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const PHONE_RE = /^\+?[0-9][0-9\s-]{7,19}$/;
    let contactEmail: string | undefined;
    let contactPhone: string | undefined;
    const rawContact = email || telepon || "";
    if (rawContact.includes("@")) {
      const clean = optionalString(rawContact, "Kontak", 254) ?? "";
      if (!EMAIL_RE.test(clean)) throw new AppError("Format email tidak valid. Contoh: nama@email.com", 400);
      contactEmail = clean;
    } else if (rawContact) {
      const clean = optionalString(rawContact, "Kontak", 30) ?? "";
      if (!PHONE_RE.test(clean)) throw new AppError("Format WhatsApp/telepon tidak valid. Contoh: 081234567890", 400);
      contactPhone = clean;
    }

    const pengaduan = await addPengaduan({
      namaPengadu,
      email: contactEmail,
      telepon: contactPhone,
      kategori,
      judul,
      pesan,
      lampiran,
    });

    // Notifikasi Telegram (gagal kirim tidak mempengaruhi penyimpanan pengaduan)
    const esc = escapeHtml;
    const kontakHtml = formatKontakForTelegram(contactEmail, contactPhone);
    const lines = [
      "<b>PESAN BARU — LAYANAN PENGADUAN LPPM</b>",
      "",
      `<b>No. Tiket:</b> #${String(pengaduan.id).padStart(4, "0")}`,
      `<b>Nama:</b> ${esc(namaPengadu || "Anonim")}`,
      `<b>Peran:</b> ${esc(kategori || "-")}`,
      `<b>Kontak:</b> ${kontakHtml}`,
      "",
      `<b>${esc(judul)}</b>`,
      esc(pesan),
    ];
    if (lampiran) lines.push("", `Lampiran: ${lampiran}`);
    await sendTelegramMessage(lines.join("\n"));

    return NextResponse.json({ success: true, message: "Pengaduan berhasil dikirim.", id: pengaduan.id }, { status: 201 });
  } catch (error: unknown) {
    return handleError(error);
  }
}
