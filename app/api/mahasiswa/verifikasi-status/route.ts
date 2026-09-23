import { NextResponse } from "next/server";
import { findUserByNpm } from "@/lib/db";
import { handleError } from "@/lib/error";
import { requireStudent } from "@/lib/authorization";

export async function GET() {
  try {
    const session = await requireStudent();
    const user = await findUserByNpm(session.npm);
    return NextResponse.json({
      success: true,
      diverifikasi: Boolean(user?.diverifikasi),
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
