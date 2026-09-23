import { NextRequest, NextResponse } from "next/server";
import { addTimeline, deleteTimeline } from "@/lib/db";
import { handleError } from "@/lib/error";
import { requireRole } from "@/lib/authorization";
import { oneOf, optionalString, positiveInteger, readJsonObject, requiredString } from "@/lib/api-validation";

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const body = await readJsonObject(req, 128_000);
    const { judul, tanggal, deskripsi, status, urutan } = body;

    const cleanJudul = requiredString(judul, "Judul tahapan", 3, 200);
    const cleanTanggal = requiredString(tanggal, "Tanggal", 3, 100);
    const cleanDeskripsi = optionalString(deskripsi, "Deskripsi", 1_000) || "";
    const cleanStatus = status
      ? oneOf(status, "Status", ["Akan Datang", "Berlangsung", "Selesai"] as const)
      : "Akan Datang";

    const urutanNumber = Number(urutan);
    const cleanUrutan = Number.isFinite(urutanNumber) && urutanNumber >= 0 ? Math.floor(urutanNumber) : 0;

    const timeline = await addTimeline({
      judul: cleanJudul,
      tanggal: cleanTanggal,
      deskripsi: cleanDeskripsi,
      status: cleanStatus,
      urutan: cleanUrutan,
    });

    return NextResponse.json({ success: true, timeline });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(req.url);
    const id = positiveInteger(searchParams.get("id"), "ID timeline");

    await deleteTimeline(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleError(error);
  }
}
