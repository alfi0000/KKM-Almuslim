import { NextResponse } from "next/server";
import {
  countPendaftarPrapendaftaran,
  getPrapendaftaranSetting,
  hitungPeriodePrapendaftaran,
  listPendaftarPrapendaftaran,
  updatePrapendaftaranSetting,
  setVerifikasiPendaftar,
} from "@/lib/db";
import { AppError, handleError } from "@/lib/error";
import { requireRole } from "@/lib/authorization";
import {
  positiveInteger,
  readJsonObject,
  requiredBoolean,
  requiredString,
} from "@/lib/api-validation";

export async function GET() {
  try {
    await requireRole("admin");
    const setting = await getPrapendaftaranSetting();
    const periode = hitungPeriodePrapendaftaran(setting);
    const [jumlah, pendaftar] = await Promise.all([
      countPendaftarPrapendaftaran(periode.mulai),
      listPendaftarPrapendaftaran(periode.mulai),
    ]);
    return NextResponse.json({
      success: true,
      setting,
      periode,
      jumlahPendaftar: jumlah,
      pendaftar,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    const body = await readJsonObject(request, 16_384);
    const durasiHari = positiveInteger(body.durasiHari, "Durasi hari");

    let tanggalMulai: string | null = null;
    if (body.tanggalMulai != null && body.tanggalMulai !== "") {
      const raw = requiredString(body.tanggalMulai, "Tanggal mulai", 4, 40);
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) throw new AppError("Tanggal mulai tidak valid.", 400);
      tanggalMulai = parsed.toISOString();
    }

    const setting = await updatePrapendaftaranSetting(tanggalMulai, durasiHari);
    const periode = hitungPeriodePrapendaftaran(setting);

    return NextResponse.json({
      success: true,
      message: "Pengaturan prapendaftaran berhasil disimpan.",
      setting,
      periode,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole("admin");
    const body = await readJsonObject(request, 16_384);
    const diverifikasi = requiredBoolean(body.diverifikasi, "Status verifikasi");

    let npms: string[];
    if (Array.isArray(body.npmList)) {
      npms = body.npmList.map((item) => requiredString(item, "NPM", 5, 20));
      if (npms.length === 0) throw new AppError("Daftar NPM kosong.", 400);
      if (npms.length > 500) throw new AppError("Maksimal 500 NPM per permintaan.", 400);
    } else {
      npms = [requiredString(body.npm, "NPM", 5, 20)];
    }

    const invalid = npms.find((npm) => !/^\d{5,20}$/.test(npm));
    if (invalid) {
      throw new AppError(`Format NPM tidak valid: ${invalid}`, 400);
    }

    await Promise.all(npms.map((npm) => setVerifikasiPendaftar(npm, diverifikasi)));

    return NextResponse.json({
      success: true,
      message: diverifikasi
        ? `${npms.length} mahasiswa disetujui. Mahasiswa kini dapat mengunggah berkas.`
        : `Verifikasi ${npms.length} mahasiswa dibatalkan.`,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
