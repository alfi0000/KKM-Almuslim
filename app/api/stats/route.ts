import { NextResponse } from "next/server";
import { getPublicStats } from "@/lib/db";
import { handleError } from "@/lib/error";

export async function GET() {
  try {
    const stats = await getPublicStats();
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
