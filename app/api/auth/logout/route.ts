import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { cookies } from "next/headers";
import { LEGACY_SESSION_COOKIES } from "@/lib/session";
import { handleError } from "@/lib/error";

async function clearLegacyCookies() {
  const store = await cookies();
  for (const name of LEGACY_SESSION_COOKIES) store.delete(name);
}

export async function POST() {
  try {
    await destroySession();
    await clearLegacyCookies();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleError(error);
  }
}
