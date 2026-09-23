import { NextResponse } from "next/server";
import { getGampongs, addGampong, deleteGampong, updateGampong } from "@/lib/db";
import { AppError, handleError } from "@/lib/error";
import { requireRole } from "@/lib/authorization";
import { optionalString, positiveInteger, readJsonValue, requiredString } from "@/lib/api-validation";

function quota(value: unknown): number {
  if (value == null || value === "") return 15;
  const result = positiveInteger(value, "Kuota");
  if (result > 500) throw new AppError("Kuota maksimal 500.", 400);
  return result;
}

export async function GET() {
  try {
    await requireRole("admin");
    const gampongs = await getGampongs();
    return NextResponse.json({ success: true, gampongs });
  } catch (error: unknown) {
    return handleError(error);
  }
}

function normalizeGampongScheme(scheme?: unknown): "KKM Reguler" | "KKM Non-Reguler" | "KKM Internasional" {
  const s = String(scheme || "").toLowerCase();
  if (s.includes("internasional")) return "KKM Internasional";
  if (s.includes("non") || s.includes("mbkm")) return "KKM Non-Reguler";
  return "KKM Reguler";
}

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const body = await readJsonValue(request);

    // Support bulk import (array of gampongs)
    if (Array.isArray(body)) {
      if (body.length === 0 || body.length > 500) throw new AppError("Import dibatasi 1–500 gampong per permintaan.", 400);
      const validated = body.map((raw, index) => {
        if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new AppError(`Baris ${index + 1} tidak valid.`, 400);
        const item = raw as Record<string, unknown>;
        const nama = requiredString(item.nama, `Nama baris ${index + 1}`, 2, 150);
        return {
          nama,
          skema: normalizeGampongScheme(item.skema),
          kabupaten: optionalString(item.kabupaten, "Kabupaten", 120) || "Bireuen",
          kecamatan: optionalString(item.kecamatan, "Kecamatan", 120) || "Peusangan",
          dpl: optionalString(item.dpl, "DPL", 150) || "Belum Ditentukan",
          keuchik: optionalString(item.keuchik, "Keuchik", 120) || "-",
          kontakKeuchik: optionalString(item.kontakKeuchik, "Kontak keuchik", 30) || "-",
          posko: optionalString(item.posko, "Posko", 150) || `Posko KKM ${nama}`,
          kuota: quota(item.kuota),
        };
      });
      const results = [];
      for (const item of validated) {
          const newGampong = await addGampong(item);
          results.push(newGampong);
      }
      return NextResponse.json({ success: true, gampongs: results });
    }

    if (typeof body !== "object" || body === null) throw new AppError("Payload tidak valid.", 400);
    const { nama, skema, kabupaten, kecamatan, dpl, keuchik, kontakKeuchik, posko, kuota } = body as Record<string, unknown>;

    const cleanNama = requiredString(nama, "Nama", 2, 150);
    const newGampong = await addGampong({
      nama: cleanNama,
      skema: normalizeGampongScheme(skema),
      kabupaten: optionalString(kabupaten, "Kabupaten", 120) || "Bireuen",
      kecamatan: optionalString(kecamatan, "Kecamatan", 120) || "Peusangan",
      dpl: optionalString(dpl, "DPL", 150) || "Belum Ditentukan",
      keuchik: optionalString(keuchik, "Keuchik", 120) || "-",
      kontakKeuchik: optionalString(kontakKeuchik, "Kontak keuchik", 30) || "-",
      posko: optionalString(posko, "Posko", 150) || `Posko KKM ${cleanNama}`,
      kuota: quota(kuota),
    });

    return NextResponse.json({ success: true, gampong: newGampong });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole("admin");
    const body = await readJsonValue(request);
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new AppError("Payload tidak valid.", 400);
    const { id, nama, skema, kabupaten, kecamatan, dpl, keuchik, kontakKeuchik, posko, kuota } = body as Record<string, unknown>;
    const gampongId = positiveInteger(id, "ID");
    const cleanNama = requiredString(nama, "Nama", 2, 150);
    const gampong = await updateGampong(gampongId, {
      nama: cleanNama,
      skema: normalizeGampongScheme(skema),
      kabupaten: optionalString(kabupaten, "Kabupaten", 120) || "Bireuen",
      kecamatan: optionalString(kecamatan, "Kecamatan", 120) || "Peusangan",
      dpl: optionalString(dpl, "DPL", 150) || "Belum Ditentukan",
      keuchik: optionalString(keuchik, "Keuchik", 120) || "-",
      kontakKeuchik: optionalString(kontakKeuchik, "Kontak keuchik", 30) || "-",
      posko: optionalString(posko, "Posko", 150) || `Posko KKM ${cleanNama}`,
      kuota: quota(kuota),
    });
    return NextResponse.json({ success: true, gampong, message: "Gampong dan posko berhasil diperbarui." });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(request.url);
    const id = positiveInteger(searchParams.get("id"), "ID");
    await deleteGampong(id);
    return NextResponse.json({ success: true, message: "Gampong berhasil dihapus." });
  } catch (error: unknown) {
    return handleError(error);
  }
}
