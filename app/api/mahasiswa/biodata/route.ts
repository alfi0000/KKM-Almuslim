import { NextResponse } from "next/server";
import { saveStudentBiodata, getProfileByNpm, getProfileEditEnabled } from "@/lib/db";
import { handleError } from "@/lib/error";
import { requireStudent } from "@/lib/authorization";
import { oneOf, readJsonObject, requiredString } from "@/lib/api-validation";

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
    const body = await readJsonObject(request, 64_000);
    const {
      npm,
      newNpm,
      nama,
      tempatLahir,
      tanggalLahir,
      fakultas,
      prodi,
      ipk,
      sksLulus,
      sksBelumLulus,
      kelasKuliah,
      statusPerkawinan,
      alamatSekarang,
      noTelepon,
      hpOrtuWali,
      email,
      kkmSemester,
    } = body as Record<string, unknown>;

    const session = await requireStudent(npm);

    // Handle NIM change if newNpm is provided and different
    let targetNpm = session.npm;
    if (newNpm && String(newNpm).trim() && String(newNpm).trim() !== session.npm) {
      const cleanNewNpm = requiredString(newNpm, "NIM", 5, 20);
      if (!/^\d{5,20}$/.test(cleanNewNpm)) throw new Error("Format NIM baru tidak valid.");
      const { findUserByNpm } = await import("@/lib/db");
      const exists = await findUserByNpm(cleanNewNpm);
      if (exists) throw new Error("NIM baru sudah digunakan.");
      targetNpm = cleanNewNpm;
    }

    const cleanNama = requiredString(nama, "Nama", 2, 120);
    const cleanTempatLahir = requiredString(tempatLahir, "Tempat lahir", 2, 100);
    const cleanTanggalLahir = requiredString(tanggalLahir, "Tanggal lahir", 4, 20);
    // validasi tanggal sederhana
    if (isNaN(Date.parse(String(cleanTanggalLahir)))) {
      throw new Error("Format tanggal lahir tidak valid. Gunakan YYYY-MM-DD.");
    }
    const cleanFakultas = oneOf(fakultas, "Fakultas", FAKULTAS);
    const cleanProdi = requiredString(prodi, "Prodi", 2, 100);
    const cleanIpk = requiredString(ipk, "IPK", 1, 10);
    const ipkNum = Number(String(cleanIpk).replace(",", "."));
    if (Number.isNaN(ipkNum) || ipkNum < 0 || ipkNum > 4) {
      throw new Error("IPK harus angka 0.00 - 4.00");
    }
    const sksL = Number(sksLulus);
    const sksBelum = Number(sksBelumLulus);
    if (!Number.isInteger(sksL) || sksL < 0 || sksL > 200) throw new Error("SKS Lulus harus 0-200");
    if (!Number.isInteger(sksBelum) || sksBelum < 0 || sksBelum > 200) throw new Error("SKS Belum Lulus harus 0-200");

    const cleanKelas = oneOf(kelasKuliah, "Kelas Kuliah", ["Reguler", "Non Reguler"] as const);
    const cleanStatusKawin = oneOf(statusPerkawinan, "Status perkawinan", ["Belum kawin", "Kawin"] as const);
    const cleanAlamat = requiredString(alamatSekarang, "Alamat Sekarang", 5, 1000);
    const cleanNoTelp = requiredString(noTelepon, "Nomor telephone", 8, 20);
    const cleanHpOrtu = requiredString(hpOrtuWali, "Hp orang tua/wali", 8, 20);
    const cleanEmail = requiredString(email, "Email", 5, 255);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(cleanEmail))) throw new Error("Format email tidak valid.");
    const cleanKkmSemester = oneOf(kkmSemester, "KKM", ["Ganjil", "Genap"] as const);

    const updated = await saveStudentBiodata(targetNpm, {
      nama: cleanNama,
      tempatLahir: cleanTempatLahir,
      tanggalLahir: cleanTanggalLahir,
      fakultas: cleanFakultas,
      prodi: cleanProdi,
      ipk: String(ipkNum.toFixed(2)),
      sksLulus: sksL,
      sksBelumLulus: sksBelum,
      kelasKuliah: cleanKelas,
      statusPerkawinan: cleanStatusKawin,
      alamatSekarang: cleanAlamat,
      noTelepon: cleanNoTelp,
      hpOrtuWali: cleanHpOrtu,
      email: String(cleanEmail),
      kkmSemester: cleanKkmSemester,
    }, session.npm);

    if (targetNpm !== session.npm) {
      const { createSession } = await import("@/lib/session");
      await createSession({ role: "mahasiswa", npm: targetNpm, nama: cleanNama });
    }

    return NextResponse.json({ success: true, message: "Biodata berhasil disimpan.", profile: updated });
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const npm = searchParams.get("npm");
    const session = await requireStudent(npm || undefined);
    const [profile, editEnabled] = await Promise.all([
      getProfileByNpm(session.npm),
      getProfileEditEnabled(),
    ]);
    return NextResponse.json({ success: true, profile: profile || null, editEnabled });
  } catch (error: unknown) {
    return handleError(error);
  }
}
