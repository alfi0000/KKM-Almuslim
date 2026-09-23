import { NextResponse } from "next/server";
import { getTimeline } from "@/lib/db";
import { handleError } from "@/lib/error";

export async function GET() {
  try {
    const timeline = await getTimeline();
    return NextResponse.json({
      success: true,
      timeline,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
