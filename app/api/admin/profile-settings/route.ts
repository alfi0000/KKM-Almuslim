import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authorization";
import { readJsonObject } from "@/lib/api-validation";
import { getProfileEditEnabled, setProfileEditEnabled } from "@/lib/db";
import { AppError, handleError } from "@/lib/error";

export async function GET() {
  try {
    await requireRole("admin");
    const enabled = await getProfileEditEnabled();
    return NextResponse.json({ success: true, enabled });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const body = await readJsonObject(request, 1_024);
    if (typeof body.enabled !== "boolean") {
      throw new AppError("Status edit profil tidak valid.", 400);
    }
    const enabled = await setProfileEditEnabled(body.enabled);
    return NextResponse.json({
      success: true,
      enabled,
      message: enabled ? "Edit profil diaktifkan untuk semua mahasiswa." : "Edit profil dinonaktifkan.",
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
