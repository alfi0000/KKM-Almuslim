import { NextResponse } from "next/server";
import {
  addOrUpdateStudentFromAdmin,
  deleteStudent,
  getDpls,
  getGampongs,
  getProfileByNpm,
  updateVerifiedStudentPlacement,
} from "@/lib/db";
import { AppError, handleError } from "@/lib/error";
import { requireRole } from "@/lib/authorization";
import { optionalString, readJsonValue, requiredString } from "@/lib/api-validation";

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const body = await readJsonValue(request);
    
    // Support bulk import (array of students)
    if (Array.isArray(body)) {
      if (body.length === 0 || body.length > 500) throw new AppError("Import dibatasi 1–500 mahasiswa per permintaan.", 400);
      const validated = body.map((raw, index) => {
        if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new AppError(`Baris ${index + 1} tidak valid.`, 400);
        const item = raw as Record<string, unknown>;
        const nama = requiredString(item.nama, `Nama baris ${index + 1}`, 2, 120);
        const npm = requiredString(item.npm, `NPM baris ${index + 1}`, 5, 20);
        const rawPass = item.password != null ? String(item.password).trim() : "";
        const password = rawPass.length >= 6 ? rawPass : "mahasiswa123";
        if (!/^\d{5,20}$/.test(npm)) throw new AppError(`Format NPM baris ${index + 1} tidak valid.`, 400);
        return { item, nama, npm, password };
      });
      const results = [];
      for (const { item, nama, npm, password } of validated) {
          const profile = await addOrUpdateStudentFromAdmin(
            nama, npm, password,
            optionalString(item.fakultas, "Fakultas", 120),
            optionalString(item.prodi, "Prodi", 120),
            optionalString(item.program, "Program", 80),
            optionalString(item.kecamatan, "Kecamatan", 120),
            optionalString(item.gampong, "Gampong", 150),
            optionalString(item.angkatan, "Angkatan", 30),
            optionalString(item.lokasi, "Lokasi", 150),
            optionalString(item.dpl, "DPL", 150),
            optionalString(item.posko, "Posko", 150),
            optionalString(item.ipk, "IPK", 10)
          );
          results.push(profile);
      }
      return NextResponse.json({
        success: true,
        message: `${results.length} mahasiswa berhasil di-import / didaftarkan.`,
        profiles: results,
      });
    }

    // Individual registration
    if (typeof body !== "object" || body === null) throw new AppError("Payload tidak valid.", 400);
    const { nama, npm, password, fakultas, prodi, program, kecamatan, gampong, angkatan, lokasi, dpl, posko, ipk } = body as Record<string, unknown>;
    if (!nama || !npm) {
      throw new AppError("Nama dan NPM wajib diisi.", 400);
    }
    if (!/^\d{5,20}$/.test(String(npm))) throw new AppError("Format NPM tidak valid.", 400);
    const cleanPassword = password ? String(password).trim() : "mahasiswa123";
    if (cleanPassword.length < 6 || cleanPassword.length > 128) {
      throw new AppError("Password mahasiswa minimal 6 karakter.", 400);
    }

    const profile = await addOrUpdateStudentFromAdmin(
      String(nama),
      String(npm),
      cleanPassword,
      fakultas ? String(fakultas) : undefined,
      prodi ? String(prodi) : undefined,
      program ? String(program) : undefined,
      kecamatan ? String(kecamatan) : undefined,
      gampong ? String(gampong) : undefined,
      angkatan ? String(angkatan) : undefined,
      lokasi ? String(lokasi) : undefined,
      dpl ? String(dpl) : undefined,
      posko ? String(posko) : undefined,
      ipk ? String(ipk) : undefined
    );

    return NextResponse.json({
      success: true,
      message: "Mahasiswa berhasil didaftarkan.",
      profile,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole("admin");
    const body = await readJsonValue(request);
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new AppError("Payload tidak valid.", 400);
    const { npm, nama, fakultas, prodi, program, kecamatan, gampong, angkatan, lokasi, dpl, posko, ipk } = body as Record<string, unknown>;

    if (!npm || !/^\d{5,20}$/.test(String(npm))) throw new AppError("Format NPM tidak valid.", 400);
    if (!nama) throw new AppError("Nama wajib diisi.", 400);
    const existingProfile = await getProfileByNpm(String(npm));
    if (existingProfile && ["terverifikasi", "terverifikasi / aktif", "menunggu pemeriksaan berkas"].includes(String(existingProfile.status || "").trim().toLowerCase())) {
      throw new AppError("Batalkan verifikasi sebelum mengubah data mahasiswa.", 409);
    }

    const profile = await addOrUpdateStudentFromAdmin(
      String(nama),
      String(npm),
      undefined, 
      fakultas ? String(fakultas) : undefined,
      prodi ? String(prodi) : undefined,
      program ? String(program) : undefined,
      kecamatan ? String(kecamatan) : undefined,
      gampong ? String(gampong) : undefined,
      angkatan ? String(angkatan) : undefined,
      lokasi ? String(lokasi) : undefined,
      dpl ? String(dpl) : undefined,
      posko ? String(posko) : undefined,
      ipk ? String(ipk) : undefined
    );

    return NextResponse.json({
      success: true,
      message: "Profil mahasiswa berhasil diperbarui.",
      profile,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole("admin");
    const body = await readJsonValue(request);
    if (typeof body !== "object" || body === null || Array.isArray(body)) throw new AppError("Payload tidak valid.", 400);

    const { npm, gampong, dpl } = body as Record<string, unknown>;
    const cleanNpm = requiredString(npm, "NPM", 5, 20);
    const cleanGampong = requiredString(gampong, "Gampong", 2, 150);
    const cleanDpl = requiredString(dpl, "DPL", 2, 150);
    if (!/^\d{5,20}$/.test(cleanNpm)) throw new AppError("Format NPM tidak valid.", 400);

    const profile = await getProfileByNpm(cleanNpm);
    if (!profile) throw new AppError("Mahasiswa tidak ditemukan.", 404);
    if (!["terverifikasi", "terverifikasi / aktif", "menunggu pemeriksaan berkas"].includes(String(profile.status || "").trim().toLowerCase())) {
      throw new AppError("DPL dan gampong hanya dapat ditetapkan setelah mahasiswa terverifikasi.", 409);
    }

    const [gampongs, dpls] = await Promise.all([getGampongs(), getDpls()]);
    const selectedGampong = gampongs.find((item) => item.nama.trim().toLowerCase() === cleanGampong.toLowerCase());
    const selectedDpl = dpls.find((item) => item.nama.trim().toLowerCase() === cleanDpl.toLowerCase());
    if (!selectedGampong) throw new AppError("Data gampong tidak ditemukan.", 404);
    if (!selectedDpl) throw new AppError("Data DPL tidak ditemukan.", 404);

    const updated = await updateVerifiedStudentPlacement(cleanNpm, {
      gampong: selectedGampong.nama,
      dpl: selectedDpl.nama,
      kecamatan: selectedGampong.kecamatan,
      posko: selectedGampong.posko,
    });

    return NextResponse.json({
      success: true,
      message: "DPL dan lokasi gampong berhasil ditetapkan.",
      profile: updated || null,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(request.url);
    const npm = searchParams.get("npm");
    if (!npm || !/^\d{5,20}$/.test(npm)) throw new AppError("Format NPM tidak valid.", 400);

    await deleteStudent(npm);

    return NextResponse.json({
      success: true,
      message: `Mahasiswa dengan NPM ${npm} berhasil dihapus dari sistem.`,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
