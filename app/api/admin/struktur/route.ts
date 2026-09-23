import { NextRequest, NextResponse } from "next/server";
import { addLppmStruktur, deleteLppmStruktur } from "@/lib/db";
import { handleError } from "@/lib/error";
import { requireRole } from "@/lib/authorization";
import { positiveInteger, readJsonObject, requiredString } from "@/lib/api-validation";

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const body = await readJsonObject(req, 32_768);
    const { label, value, urutan } = body;

    const struktur = await addLppmStruktur({
      label: requiredString(label, "Label", 2, 120),
      value: requiredString(value, "Nilai", 2, 500),
      urutan: urutan == null ? 0 : Math.min(10_000, Math.max(0, Number(urutan) || 0)),
    });

    return NextResponse.json({ success: true, struktur });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(req.url);
    const id = positiveInteger(searchParams.get("id"), "ID struktur");

    await deleteLppmStruktur(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleError(error);
  }
}
