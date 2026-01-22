import mysql from "mysql2/promise";

import { env } from "@/lib/env";
import { runMySqlMigrations } from "@/lib/db/migrations";

declare global {
  // eslint-disable-next-line no-var
  var __mysqlPool: mysql.Pool | undefined;
  // eslint-disable-next-line no-var
  var __mysqlPoolDateStrings: boolean | undefined;
  // eslint-disable-next-line no-var
  var __mysqlMigrationsPromise: Promise<void> | undefined;
}

const shouldCreatePool = !global.__mysqlPool || global.__mysqlPoolDateStrings !== true;

export const mysqlPool: mysql.Pool =
  !shouldCreatePool && global.__mysqlPool
    ? global.__mysqlPool
    : mysql.createPool({
        host: env.DB_HOST,
        port: env.DB_PORT,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        ssl: env.DB_SSL ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined,
        dateStrings: true,
        supportBigNumbers: true,
        bigNumberStrings: true,
      });

if (shouldCreatePool) {
  global.__mysqlPool = mysqlPool;
  global.__mysqlPoolDateStrings = true;
}

export async function ensureMySqlMigrations() {
  if (env.SKIP_MIGRATIONS) {
    return;
  }
  if (!global.__mysqlMigrationsPromise) {
    global.__mysqlMigrationsPromise = runMySqlMigrations(mysqlPool).catch((error) => {
      global.__mysqlMigrationsPromise = undefined;
      throw error;
    });
  }
  await global.__mysqlMigrationsPromise;
}

export async function mysqlGetConnection() {
  await ensureMySqlMigrations();
  return mysqlPool.getConnection();
}

export async function mysqlQuery<T>(
  sql: string,
  params?: mysql.QueryOptions["values"]
): Promise<T[]> {
  await ensureMySqlMigrations();
  const [rows] = await mysqlPool.query(sql, params);
  return rows as T[];
}

export async function mysqlExec(
  sql: string,
  params?: mysql.QueryOptions["values"]
) {
  await ensureMySqlMigrations();
  const [result] = await mysqlPool.execute(sql, params);
  return result;
}
