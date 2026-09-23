import { NextResponse } from "next/server";
import { handleError } from "@/lib/error";
import { getMysqlConfigurationStatus, pingMysql } from "@/lib/mysql";

function bool(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET() {
  try {
    const jwtSecret = process.env.JWT_SECRET || "";
    const mysqlConfiguration = getMysqlConfigurationStatus();
    let mysqlConnected = false;
    if (mysqlConfiguration.configured) {
      try {
        await pingMysql();
        mysqlConnected = true;
      } catch {
        mysqlConnected = false;
      }
    }
    const checks = {
      jwtSecretSet: jwtSecret.length >= 32,
      jwtSecretLength: jwtSecret.length,
      mysqlConfigured: mysqlConfiguration.configured,
      mysqlConnected,
      mysqlSslEnabled: mysqlConfiguration.sslEnabled,
      cloudinarySet: bool(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME),
      nodeEnv: process.env.NODE_ENV || null,
    };
    const allOk = checks.jwtSecretSet && checks.mysqlConfigured && checks.mysqlConnected;

    return NextResponse.json({
      success: allOk,
      allOk,
      checks,
      hint: !checks.jwtSecretSet
        ? "JWT_SECRET wajib diisi minimal 32 karakter."
        : !checks.mysqlConfigured
          ? "Isi DATABASE_URL atau variabel MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER, dan MYSQL_PASSWORD."
          : !checks.mysqlConnected
            ? "Konfigurasi tersedia, tetapi koneksi MySQL gagal."
          : "Konfigurasi tampak lengkap.",
    }, { status: allOk ? 200 : 503 });
  } catch (error: unknown) {
    return handleError(error);
  }
}
