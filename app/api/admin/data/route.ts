import { NextResponse } from "next/server";
import { getAdminData, getAdminDataPaginated } from "@/lib/db";
import { handleError } from "@/lib/error";
import { requireRole } from "@/lib/authorization";

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(request.url);
    const hasPagination = searchParams.has("profileLimit") || searchParams.has("logbookLimit") || searchParams.has("laporanLimit");
    if (hasPagination) {
      const profileLimit = Number(searchParams.get("profileLimit") || 200);
      const profileOffset = Number(searchParams.get("profileOffset") || 0);
      const logbookLimit = Number(searchParams.get("logbookLimit") || 200);
      const laporanLimit = Number(searchParams.get("laporanLimit") || 200);
      const partial = await getAdminDataPaginated({ profileLimit, profileOffset, logbookLimit, laporanLimit });
      // Lengkapi data lain (gampongs, dpls, etc) dari cache full jika perlu? Untuk kompatibilitas, ambil full lainnya
      const full = await getAdminData();
      return NextResponse.json({
        success: true,
        data: { ...full, ...partial },
      }, { headers: { "Cache-Control": "no-store" } });
    }
    const forceRefresh = searchParams.get("refresh") === "1";
    const data = await getAdminData({ forceRefresh });
    return NextResponse.json({
      success: true,
      data: data,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: unknown) {
    return handleError(error);
  }
}
