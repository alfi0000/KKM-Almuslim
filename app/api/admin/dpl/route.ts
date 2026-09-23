import { NextResponse } from "next/server";
import { getDpls, addDpl, deleteDpl, updateDplByAdmin } from "@/lib/db";
import { AppError, handleError } from "@/lib/error";
import { requireRole } from "@/lib/authorization";
import { optionalString, positiveInteger, readJsonValue, requiredString } from "@/lib/api-validation";

export async function GET() {
  try {
    await requireRole("admin");
    const dpls = await getDpls();
    return NextResponse.json({ success: true, dpls });
  } catch (error: unknown) {
    return handleError(error);
  }
}

function normalizeDplScheme(scheme?: unknown): "KKM Reguler" | "KKM Non-Reguler" | "KKM Internasional" {
  const s = String(scheme || "").toLowerCase();
  if (s.includes("internasional")) return "KKM Internasional";
  if (s.includes("non") || s.includes("mbkm")) return "KKM Non-Reguler";
  return "KKM Reguler";
}

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const body = await readJsonValue(request);

    // Support bulk import (array of DPLs)
    if (Array.isArray(body)) {
      if (body.length === 0 || body.length > 500) throw new AppError("Import dibatasi 1–500 DPL per permintaan.", 400);
      const validated = body.map((raw, index) => {
        if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new AppError(`Baris ${index + 1} tidak valid.`, 400);
        const item = raw as Record<string, unknown>;
        const rawPass = item.password != null ? String(item.password).trim() : "";
        return {
          nama: requiredString(item.nama, `Nama baris ${index + 1}`, 2, 120),
          nidn: requiredString(item.nidn, `NIDN baris ${index + 1}`, 3, 30),
          password: rawPass.length >= 6 ? rawPass : "dpl123",
          fakultas: optionalString(item.fakultas, "Fakultas", 120) || "Fakultas Ilmu Komputer (FIKOM)",
          skema: normalizeDplScheme(item.skema),
          kecamatan: optionalString(item.kecamatan, "Kecamatan", 120) || "Peusangan",
        };
      });
      const results = [];
      for (const item of validated) {
          const newDpl = await addDpl({
            ...item,
          });
          results.push(newDpl);
      }
      return NextResponse.json({ success: true, dpls: results });
    }

    if (typeof body !== "object" || body === null) throw new AppError("Payload tidak valid.", 400);
    const { nama, nidn, password, fakultas, skema, kecamatan } = body as Record<string, unknown>;

    if (!nama || !nidn) {
      throw new AppError("Mohon isi Nama DPL dan NIDN.", 400);
    }
    const cleanPassword = password ? String(password).trim() : "dpl123";
    if (cleanPassword.length < 6 || cleanPassword.length > 128) {
      throw new AppError("Password DPL minimal 6 karakter.", 400);
    }

    const newDpl = await addDpl({
      nama: String(nama).trim(),
      nidn: String(nidn).trim(),
      password: cleanPassword,
      fakultas: optionalString(fakultas, "Fakultas", 120) || "Fakultas Ilmu Komputer (FIKOM)",
      skema: normalizeDplScheme(skema),
      kecamatan: String(kecamatan || "Peusangan").trim(),
    });

    return NextResponse.json({ success: true, dpl: newDpl });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole("admin");
    const body = await readJsonValue(request);
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new AppError("Payload tidak valid.", 400);
    const { id, nama, nidn, password, fakultas, skema, kecamatan } = body as Record<string, unknown>;
    const dplId = positiveInteger(id, "ID");
    const cleanPassword = optionalString(password, "Password", 128);
    if (cleanPassword && cleanPassword.length < 6) throw new AppError("Password DPL minimal 6 karakter.", 400);
    const dpl = await updateDplByAdmin(dplId, {
      nama: requiredString(nama, "Nama DPL", 2, 120),
      nidn: requiredString(nidn, "NIDN", 3, 30),
      password: cleanPassword,
      fakultas: optionalString(fakultas, "Fakultas", 120) || "Fakultas Ilmu Komputer (FIKOM)",
      skema: normalizeDplScheme(skema),
      kecamatan: optionalString(kecamatan, "Kecamatan", 120) || "Peusangan",
    });
    return NextResponse.json({ success: true, dpl, message: "Akun DPL berhasil diperbarui." });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(request.url);
    const id = positiveInteger(searchParams.get("id"), "ID");
    await deleteDpl(id);
    return NextResponse.json({ success: true, message: "Akun DPL berhasil dihapus." });
  } catch (error: unknown) {
    return handleError(error);
  }
}
