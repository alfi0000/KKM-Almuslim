import { NextResponse } from "next/server";
import { setStudentProgram, getProfileByNpm, getGampongs, getDpls, findUserByNpm } from "@/lib/db";
import { AppError, handleError } from "@/lib/error";
import { requireStudent } from "@/lib/authorization";
import { optionalTrustedUploadUrl } from "@/lib/validation";
import { oneOf, readJsonObject, requiredString } from "@/lib/api-validation";

const PROGRAMS = ["KKM Reguler", "KKM Non-Reguler", "KKM Internasional"] as const;
const FAKULTAS = [
  "Fakultas Pertanian (FP)",
  "Fakultas Keguruan dan Ilmu Pendidikan (FKIP)",
  "Fakultas Teknik (FT)",
  "Fakultas Ilmu Sosial dan Ilmu Politik (FISIP)",
  "Fakultas Ekonomi (FE)",
  "Fakultas Ilmu Komputer (FIKOM)",
] as const;

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const { npm, program, dpl, transkrip, krs, khs, paspor, fakultas, foto, buktiPembayaran, gampong } = body;
    const session = await requireStudent(npm);

    const user = await findUserByNpm(session.npm);
    if (!user?.diverifikasi) {
      throw new AppError(
        "Prapendaftaran Anda belum diverifikasi admin. Anda belum dapat mengunggah berkas.",
        403
      );
    }

    const selectedProgram = oneOf(program, "Program", PROGRAMS);
    const selectedFakultas = oneOf(fakultas, "Fakultas", FAKULTAS);
    const selectedGampong = requiredString(gampong, "Gampong", 2, 150);
    const selectedDpl = requiredString(dpl, "DPL", 2, 150);
    const [gampongs, dpls] = await Promise.all([getGampongs(), getDpls()]);
    const officialGampong = gampongs.find((item) => item.nama === selectedGampong && item.skema === selectedProgram);
    if (!officialGampong) throw new AppError("Gampong tidak tersedia untuk program yang dipilih.", 400);
    const officialDpl = dpls.find((item) => item.nama === selectedDpl && item.skema === selectedProgram);
    if (!officialDpl || (officialDpl.kecamatan && officialDpl.kecamatan !== officialGampong.kecamatan)) {
      throw new AppError("DPL tidak tersedia untuk program dan wilayah yang dipilih.", 400);
    }
    if (!transkrip || !krs || !khs || !buktiPembayaran || (selectedProgram === "KKM Internasional" && !paspor)) {
      throw new AppError("Berkas persyaratan program belum lengkap.", 400);
    }

    const updatedProfile = await setStudentProgram(
      session.npm,
      selectedProgram,
      officialGampong.kecamatan,
      officialDpl.nama,
      optionalTrustedUploadUrl(transkrip, "Transkrip"),
      optionalTrustedUploadUrl(krs, "KRS"),
      optionalTrustedUploadUrl(khs, "KHS"),
      optionalTrustedUploadUrl(paspor, "Paspor"),
      selectedFakultas,
      optionalTrustedUploadUrl(foto, "Foto"),
      undefined,
      undefined,
      optionalTrustedUploadUrl(buktiPembayaran, "Bukti pembayaran"),
      officialGampong.nama,
      officialGampong.posko
    );

    return NextResponse.json({
      success: true,
      message: `Berhasil mendaftar skema ${selectedProgram} ke database.`,
      profile: updatedProfile,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const npm = searchParams.get("npm");
    const session = await requireStudent(npm || undefined);

    const profile = await getProfileByNpm(session.npm);

    return NextResponse.json({
      success: true,
      profile: profile || null,
    });
  } catch (error: unknown) {
    return handleError(error);
  }
}
