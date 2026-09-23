import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { handleError } from "@/lib/error";

import type { SessionPayload } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const responseOptions = { headers: { "Cache-Control": "no-store, private" } };
    const roleParam = new URL(req.url).searchParams.get("role");
    const allowedRoles: SessionPayload["role"][] = ["mahasiswa", "admin", "dpl", "lppm"];
    const expectedRole = allowedRoles.includes(roleParam as SessionPayload["role"])
      ? (roleParam as SessionPayload["role"])
      : undefined;
    const session = await getSession(expectedRole);
    if (!session) {
      return NextResponse.json({ success: false, session: null }, { status: 401, ...responseOptions });
    }
    return NextResponse.json({ success: true, session }, responseOptions);
  } catch (error: unknown) {
    return handleError(error);
  }
}
