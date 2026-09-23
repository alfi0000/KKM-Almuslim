import { NextResponse } from "next/server";
import { getProfileByNpm, getLogbooksByNpm, getLaporansByNpm } from "@/lib/db";
import { AppError, handleError } from "@/lib/error";
import { requireRole } from "@/lib/authorization";
import { requiredString } from "@/lib/api-validation";

export async function GET(request: Request) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(request.url);
    const npm = requiredString(searchParams.get("npm"), "NPM", 5, 20);
    if (!/^\d{5,20}$/.test(npm)) throw new AppError("Format NPM tidak valid.", 400);

    const profile = await getProfileByNpm(npm);
    const logbooks = await getLogbooksByNpm(npm);
    const laporans = await getLaporansByNpm(npm);

    return NextResponse.json({ success: true, profile: profile || null, logbooks, laporans });
  } catch (error: unknown) {
    return handleError(error);
  }
}
