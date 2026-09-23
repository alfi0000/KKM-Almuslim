import { NextResponse } from "next/server";
import { handleError } from "@/lib/error";
import { requireRole } from "@/lib/authorization";
import { getBerkasUploadEnabled, setBerkasUploadEnabled } from "@/lib/db";

export async function GET() {
  try {
    await requireRole("admin");
    const enabled = await getBerkasUploadEnabled();
    return NextResponse.json({ success: true, enabled });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const body = await request.json().catch(() => ({} as any));
    const enabled = Boolean(body.enabled);
    // jika tidak ada body.enabled, toggle
    const current = await getBerkasUploadEnabled();
    const next = body.hasOwnProperty("enabled") ? enabled : !current;
    await setBerkasUploadEnabled(next);
    return NextResponse.json({ success: true, enabled: next, message: next ? "Upload berkas diaktifkan untuk semua mahasiswa." : "Upload berkas dinonaktifkan." });
  } catch (error: unknown) {
    return handleError(error);
  }
}
