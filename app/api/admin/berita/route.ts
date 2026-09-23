import { NextRequest, NextResponse } from "next/server";
import { addBerita, deleteBerita } from "@/lib/db";
import { handleError } from "@/lib/error";
import { requireRole } from "@/lib/authorization";
import { oneOf, optionalString, positiveInteger, readJsonObject, requiredString } from "@/lib/api-validation";

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const body = await readJsonObject(req, 128_000);
    const { judul, kategori, tanggal, penulis, gambar, konten } = body;
    const cleanTitle = requiredString(judul, "Judul", 3, 200);
    const cleanDate = requiredString(tanggal, "Tanggal", 4, 40);
    const cleanContent = requiredString(konten, "Konten", 10, 50_000);

    const berita = await addBerita({
      judul: cleanTitle,
      kategori: kategori ? oneOf(kategori, "Kategori", ["Berita Kampus", "Pengumuman", "Kegiatan KKM"] as const) : "Berita Kampus",
      tanggal: cleanDate,
      penulis: optionalString(penulis, "Penulis", 120) || "Humas LPPM UMuslim",
      gambar: optionalString(gambar, "Gambar", 500) || "",
      konten: cleanContent,
    });

    return NextResponse.json({ success: true, berita });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(req.url);
    const id = positiveInteger(searchParams.get("id"), "ID berita");

    await deleteBerita(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleError(error);
  }
}
