import { NextResponse } from "next/server";
import { getBerita } from "@/lib/db";
import { handleError } from "@/lib/error";

export async function GET() {
  try {
    const berita = await getBerita();
    return NextResponse.json({
      success: true,
      berita,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
