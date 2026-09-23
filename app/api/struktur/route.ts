import { NextResponse } from "next/server";
import { getLppmStruktur } from "@/lib/db";
import { handleError } from "@/lib/error";

export async function GET() {
  try {
    const data = await getLppmStruktur();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return handleError(error);
  }
}
