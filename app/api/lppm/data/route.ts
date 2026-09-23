import { NextResponse } from "next/server";
import { getLppmMonitoringData } from "@/lib/db";
import { handleError } from "@/lib/error";
import { requireRole } from "@/lib/authorization";

export const maxDuration = 60;

export async function GET() {
  try {
    await requireRole("lppm");
    const data = await getLppmMonitoringData();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return handleError(error);
  }
}
