import { NextRequest, NextResponse } from "next/server";
import { addDokumen, deleteDokumen } from "@/lib/db";
import { handleError } from "@/lib/error";
import { requireRole } from "@/lib/authorization";
import { optionalString, positiveInteger, readJsonObject, requiredString } from "@/lib/api-validation";

const ALLOWED_FORMATS = ["PDF", "DOCX"] as const;

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const body = await readJsonObject(req, 128_000);
    const { judul, kategori, deskripsi, fileUrl, format, ukuran } = body;

    const cleanTitle = requiredString(judul, "Judul", 3, 200);
    const cleanKategori = requiredString(kategori, "Kategori", 3, 100);
    const cleanDeskripsi = optionalString(deskripsi, "Deskripsi", 1_000) || "";
    const cleanFileUrl = requiredString(fileUrl, "URL berkas", 5, 512);
    const cleanFormat = String(format || "").toUpperCase();

    if (!ALLOWED_FORMATS.includes(cleanFormat as (typeof ALLOWED_FORMATS)[number])) {
      return NextResponse.json({ success: false, error: `Format harus salah satu dari: ${ALLOWED_FORMATS.join(", ")}.` }, { status: 400 });
    }

    const sizeNumber = Number(ukuran);
    const cleanUkuran = Number.isFinite(sizeNumber) && sizeNumber >= 0 ? Math.floor(sizeNumber) : 0;

    const dokumen = await addDokumen({
      judul: cleanTitle,
      kategori: cleanKategori,
      deskripsi: cleanDeskripsi,
      fileUrl: cleanFileUrl,
      format: cleanFormat,
      ukuran: cleanUkuran,
    });

    return NextResponse.json({ success: true, dokumen });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(req.url);
    const id = positiveInteger(searchParams.get("id"), "ID dokumen");

    await deleteDokumen(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleError(error);
  }
}
