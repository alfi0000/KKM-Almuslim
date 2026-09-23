import { NextResponse } from "next/server";
import { getActiveLogbookWeek, setActiveLogbookWeek } from "@/lib/db";
import { AppError, handleError } from "@/lib/error";
import { requireRole } from "@/lib/authorization";
import { readJsonValue } from "@/lib/api-validation";

export async function GET() {
  try {
    await requireRole("admin");
    return NextResponse.json({ success: true, activeWeek: await getActiveLogbookWeek() });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const body = await readJsonValue(request);
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new AppError("Payload tidak valid.", 400);
    const value = (body as Record<string, unknown>).activeWeek;
    const activeWeek = value == null ? null : Number(value);
    if (activeWeek !== null && (!Number.isInteger(activeWeek) || activeWeek < 1 || activeWeek > 3)) {
      throw new AppError("Minggu logbook harus 1, 2, 3, atau kosong untuk menutup semuanya.", 400);
    }
    return NextResponse.json({ success: true, activeWeek: await setActiveLogbookWeek(activeWeek) });
  } catch (error: unknown) {
    return handleError(error);
  }
}
