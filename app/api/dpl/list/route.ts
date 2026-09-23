import { NextResponse } from "next/server";
import { getDpls } from "@/lib/db";
import { handleError } from "@/lib/error";

export async function GET() {
  try {
    const records = await getDpls();
    const dpls = records.map(({ id, nama, fakultas, skema, kecamatan }) => ({
      id, nama, fakultas, skema, kecamatan,
    }));
    return NextResponse.json({
      success: true,
      dpls,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
