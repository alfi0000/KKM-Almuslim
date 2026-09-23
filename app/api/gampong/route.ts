import { NextResponse } from "next/server";
import { getGampongs } from "@/lib/db";
import { handleError } from "@/lib/error";

export async function GET() {
  try {
    const records = await getGampongs();
    const gampongs = records.map(({ nama, skema, kecamatan, dpl, posko, kuota }) => ({
      nama, skema, kecamatan, dpl, posko, kuota,
    }));
    return NextResponse.json({ success: true, gampongs });
  } catch (error: unknown) {
    return handleError(error);
  }
}
