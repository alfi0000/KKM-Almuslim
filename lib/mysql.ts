import {
  createPool,
  type Pool,
  type PoolConnection,
  type PoolOptions,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

export type SqlValue = string | number | boolean | Date | Buffer | null;
export type MysqlRow = RowDataPacket & Record<string, unknown>;

type QueryExecutor = Pool | PoolConnection;

export interface MysqlExecutor {
  queryRows<T extends MysqlRow = MysqlRow>(sql: string, values?: SqlValue[]): Promise<T[]>;
  queryOne<T extends MysqlRow = MysqlRow>(sql: string, values?: SqlValue[]): Promise<T | undefined>;
  execute(sql: string, values?: SqlValue[]): Promise<ResultSetHeader>;
}

declare global {
  var __kkmMysqlPool: Pool | undefined;
}

function isEnabled(value: string | undefined): boolean {
  return value === "1" || value?.toLowerCase() === "true";
}

function readConnectionLimit(): number {
  const value = Number(process.env.MYSQL_CONNECTION_LIMIT || 10);
  return Number.isInteger(value) && value > 0 && value <= 50 ? value : 10;
}

function getPoolOptions(): PoolOptions {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const database = process.env.MYSQL_DATABASE?.trim();
  const user = process.env.MYSQL_USER?.trim();

  if (!databaseUrl && (!database || !user)) {
    throw new Error(
      "Konfigurasi MySQL belum lengkap. Isi DATABASE_URL atau MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER, dan MYSQL_PASSWORD."
    );
  }

  const ca = process.env.MYSQL_SSL_CA?.replace(/\\n/g, "\n").trim();
  const useSsl = isEnabled(process.env.MYSQL_SSL) || Boolean(ca);
  const port = Number(process.env.MYSQL_PORT || 3306);

  const connectionLimit = readConnectionLimit();
  // Antrean dibatasi agar saat DB sibuk request tidak menumpuk di memori sampai OOM
  const queueLimit = Math.min(Math.max(connectionLimit * 2, 20), 100);
  return {
    ...(databaseUrl
      ? { uri: databaseUrl }
      : {
          host: process.env.MYSQL_HOST?.trim() || "127.0.0.1",
          port: Number.isInteger(port) && port > 0 && port <= 65535 ? port : 3306,
          database,
          user,
          password: process.env.MYSQL_PASSWORD || "",
        }),
    waitForConnections: true,
    connectionLimit,
    maxIdle: connectionLimit,
    idleTimeout: 60_000,
    queueLimit,
    connectTimeout: 10_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: "utf8mb4",
    timezone: "Z",
    dateStrings: ["DATE"],
    decimalNumbers: true,
    supportBigNumbers: true,
    bigNumberStrings: false,
    ssl: useSsl
      ? {
          rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== "false",
          ...(ca ? { ca } : {}),
        }
      : undefined,
  };
}

export function getMysqlPool(): Pool {
  if (globalThis.__kkmMysqlPool) return globalThis.__kkmMysqlPool;

  const pool = createPool(getPoolOptions());
  globalThis.__kkmMysqlPool = pool;
  return pool;
}

function createExecutor(executor: QueryExecutor): MysqlExecutor {
  return {
    async queryRows<T extends MysqlRow = MysqlRow>(sql: string, values: SqlValue[] = []): Promise<T[]> {
      const [rows] = await executor.execute<T[]>(sql, values);
      return rows;
    },

    async queryOne<T extends MysqlRow = MysqlRow>(sql: string, values: SqlValue[] = []): Promise<T | undefined> {
      const [rows] = await executor.execute<T[]>(sql, values);
      return rows[0];
    },

    async execute(sql: string, values: SqlValue[] = []): Promise<ResultSetHeader> {
      const [result] = await executor.execute<ResultSetHeader>(sql, values);
      return result;
    },
  };
}

export const mysql: MysqlExecutor = {
  queryRows<T extends MysqlRow = MysqlRow>(sql: string, values: SqlValue[] = []) {
    return createExecutor(getMysqlPool()).queryRows<T>(sql, values);
  },

  queryOne<T extends MysqlRow = MysqlRow>(sql: string, values: SqlValue[] = []) {
    return createExecutor(getMysqlPool()).queryOne<T>(sql, values);
  },

  execute(sql: string, values: SqlValue[] = []) {
    return createExecutor(getMysqlPool()).execute(sql, values);
  },
};

export async function withMysqlTransaction<T>(callback: (database: MysqlExecutor) => Promise<T>): Promise<T> {
  const connection = await getMysqlPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(createExecutor(connection));
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function pingMysql(): Promise<void> {
  const connection = await getMysqlPool().getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

export function getMysqlConfigurationStatus() {
  const databaseUrlSet = Boolean(process.env.DATABASE_URL?.trim());
  const discreteConfigurationSet = Boolean(
    process.env.MYSQL_DATABASE?.trim() && process.env.MYSQL_USER?.trim()
  );

  return {
    databaseUrlSet,
    discreteConfigurationSet,
    configured: databaseUrlSet || discreteConfigurationSet,
    sslEnabled: isEnabled(process.env.MYSQL_SSL) || Boolean(process.env.MYSQL_SSL_CA?.trim()),
  };
}
