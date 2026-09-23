import { NextRequest, NextResponse } from "next/server";
import { deleteLogbook } from "@/lib/db";
import { handleError } from "@/lib/error";
import { requireRole } from "@/lib/authorization";
import { positiveInteger } from "@/lib/api-validation";

export async function DELETE(req: NextRequest) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(req.url);
    const id = positiveInteger(searchParams.get("id"), "ID logbook");

    await deleteLogbook(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleError(error);
  }
}
