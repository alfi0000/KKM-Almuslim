import nextEnv from "@next/env";
import { createConnection } from "mysql2/promise";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

function enabled(value) {
  return value === "1" || value?.toLowerCase() === "true";
}

function parseDatabaseUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "mysql:" && url.protocol !== "mysql2:") {
    throw new Error("DATABASE_URL harus memakai protokol mysql:// atau mysql2://.");
  }
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
  };
}

export function getConnectionOptions(includeDatabase = true) {
  const urlOptions = process.env.DATABASE_URL?.trim()
    ? parseDatabaseUrl(process.env.DATABASE_URL.trim())
    : null;
  const database = urlOptions?.database || process.env.MYSQL_DATABASE?.trim();
  const user = urlOptions?.user || process.env.MYSQL_USER?.trim();
  if (!database || !user) {
    throw new Error(
      "Isi DATABASE_URL atau MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER, dan MYSQL_PASSWORD."
    );
  }
  if (!/^[A-Za-z0-9_$-]+$/.test(database)) {
    throw new Error("Nama MYSQL_DATABASE hanya boleh berisi huruf, angka, _, $, atau -.");
  }

  const ca = process.env.MYSQL_SSL_CA?.replace(/\\n/g, "\n").trim();
  const useSsl = enabled(process.env.MYSQL_SSL) || Boolean(ca);
  return {
    host: urlOptions?.host || process.env.MYSQL_HOST?.trim() || "127.0.0.1",
    port: urlOptions?.port || Number(process.env.MYSQL_PORT || 3306),
    user,
    password: urlOptions?.password ?? process.env.MYSQL_PASSWORD ?? "",
    ...(includeDatabase ? { database } : {}),
    charset: "utf8mb4",
    timezone: "Z",
    decimalNumbers: true,
    supportBigNumbers: true,
    ssl: useSsl
      ? {
          rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== "false",
          ...(ca ? { ca } : {}),
        }
      : undefined,
  };
}

export function getDatabaseName() {
  return getConnectionOptions(true).database;
}

export async function ensureDatabase() {
  const database = getDatabaseName();
  const connection = await createConnection(getConnectionOptions(false));
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database.replaceAll("`", "``")}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

export function connectMysql() {
  return createConnection(getConnectionOptions(true));
}
