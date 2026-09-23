import { NextResponse } from "next/server";
import { getAnnouncement } from "@/lib/db";
import { handleError } from "@/lib/error";

export async function GET() {
  try {
    const announcement = await getAnnouncement();
    return NextResponse.json({
      success: true,
      announcement,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}