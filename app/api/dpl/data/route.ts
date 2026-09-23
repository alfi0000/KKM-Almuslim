import { NextResponse } from "next/server";
import { findDplByNidn, getDplData } from "@/lib/db";
import { getSession } from "@/lib/session";
import { AppError, handleError } from "@/lib/error";

export const maxDuration = 60;

export async function GET() {
  try {
    const session = await getSession("dpl");
    if (!session || session.role !== "dpl") {
      throw new AppError("Tidak terautentikasi.", 401);
    }

    const dpl = await findDplByNidn(session.nidn || "");
    const dplNama = dpl?.nama || session.nama;
    if (!dplNama) {
      throw new AppError("Data DPL tidak ditemukan.", 404);
    }

    const data = await getDplData(dplNama);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return handleError(error);
  }
}
