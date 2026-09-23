import { NextResponse } from "next/server";
import { setStudentVerificationStatus } from "@/lib/db";
import { AppError, handleError } from "@/lib/error";
import { requireRole } from "@/lib/authorization";
import { oneOf, optionalString, readJsonObject, requiredString } from "@/lib/api-validation";

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const body = await readJsonObject(request, 16_384);
    const { npm, action, catatanVerifikasiBerkas } = body;
    const cleanNpm = requiredString(npm, "NPM", 5, 20);
    if (!/^\d{5,20}$/.test(cleanNpm)) throw new AppError("Format NPM tidak valid.", 400);
    const cleanAction = oneOf(action, "Action", [
      "verify",
      "request_changes",
      "cancel_verification",
      "approve",
      "reject",
      "verify_documents",
      "reject_documents",
    ] as const);

    const statusByAction = {
      verify: "Terverifikasi",
      request_changes: "Perlu Perbaikan",
      cancel_verification: "Perlu Perbaikan",
      approve: "Terverifikasi",
      reject: "Perlu Perbaikan",
      verify_documents: "Terverifikasi",
      reject_documents: "Perlu Perbaikan",
    } as const;
    const status = statusByAction[cleanAction];
    const cleanCatatan = optionalString(catatanVerifikasiBerkas, "Komentar verifikasi berkas", 10_000);
    if (["request_changes", "reject", "reject_documents"].includes(cleanAction) && !cleanCatatan) {
      throw new AppError("Catatan perbaikan wajib diisi.", 400);
    }
    const updatesAccountVerification = !["verify_documents", "reject_documents"].includes(cleanAction);
    const updated = await setStudentVerificationStatus(cleanNpm, status, cleanCatatan, updatesAccountVerification);

    return NextResponse.json({ success: true, message: `Status mahasiswa diperbarui: ${status}`, profile: updated || null });
  } catch (error: unknown) {
    return handleError(error);
  }
}
