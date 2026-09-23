import { NextResponse } from "next/server";
import { getDokumen } from "@/lib/db";
import { handleError } from "@/lib/error";

export async function GET() {
  try {
    const dokumen = await getDokumen();
    return NextResponse.json({
      success: true,
      dokumen,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
