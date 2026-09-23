import { NextResponse } from "next/server";
import { getPrapendaftaranStatus } from "@/lib/db";
import { handleError } from "@/lib/error";

export async function GET() {
  try {
    const periode = await getPrapendaftaranStatus();
    return NextResponse.json({ success: true, ...periode });
  } catch (error: unknown) {
    return handleError(error);
  }
}
