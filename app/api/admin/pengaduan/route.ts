import { NextRequest, NextResponse } from "next/server";
import { getPengaduanList, getPengaduanById, updatePengaduanStatus } from "@/lib/db";
import { handleError } from "@/lib/error";
import { requireRole } from "@/lib/authorization";
import { oneOf, optionalString, positiveInteger, readJsonObject } from "@/lib/api-validation";

export async function GET() {
  try {
    await requireRole("admin");
    const list = await getPengaduanList();
    return NextResponse.json({ success: true, pengaduans: list });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const b = await readJsonObject(req, 32_768);
    const id = positiveInteger(b.id, "ID");
    const status = oneOf(b.status, "Status", ["Baru", "Diproses", "Selesai", "Ditolak"] as const);
    const tanggapan = optionalString(b.tanggapan, "Tanggapan", 5_000);
    const assignedAdmin = optionalString(b.assignedAdmin, "Admin", 120);
    await updatePengaduanStatus(id, status, tanggapan, assignedAdmin);
    const updated = await getPengaduanById(id);
    return NextResponse.json({ success: true, pengaduan: updated });
  } catch (error: unknown) {
    return handleError(error);
  }
}
