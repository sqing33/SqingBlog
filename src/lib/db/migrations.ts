import fs from "node:fs/promises";
import path from "node:path";
import type mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2/promise";

const MIGRATIONS_TABLE = "schema_migrations";
const MIGRATIONS_LOCK_TIMEOUT_SECONDS = 20;
const MIGRATION_FILE_RE = /^\d{4}-\d{2}-\d{2}_.+\.sql$/;

function splitSqlStatements(input: string) {
  const sql = input.replace(/^\uFEFF/, "");
  const statements: string[] = [];

  let current = "";
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        current += "\n";
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (!inSingle && !inDouble && !inBacktick) {
      if (char === "-" && next === "-") {
        const nextNext = sql[index + 2];
        const prev = index > 0 ? sql[index - 1] : "";
        const startsWithWhitespace = index === 0 || /\s/.test(prev);
        const hasSpaceAfter = nextNext === undefined || /\s/.test(nextNext);
        if (startsWithWhitespace && hasSpaceAfter) {
          inLineComment = true;
          index += 1;
          continue;
        }
      }

      if (char === "#") {
        inLineComment = true;
        continue;
      }

      if (char === "/" && next === "*") {
        inBlockComment = true;
        index += 1;
        continue;
      }

      if (char === ";") {
        const stmt = current.trim();
        if (stmt) statements.push(stmt);
        current = "";
        continue;
      }
    }

    if ((inSingle || inDouble) && char === "\\" && next !== undefined) {
      current += char + next;
      index += 1;
      continue;
    }

    if (!inDouble && !inBacktick && char === "'") {
      if (inSingle && next === "'") {
        current += "''";
        index += 1;
        continue;
      }
      inSingle = !inSingle;
      current += char;
      continue;
    }

    if (!inSingle && !inBacktick && char === "\"") {
      if (inDouble && next === "\"") {
        current += "\"\"";
        index += 1;
        continue;
      }
      inDouble = !inDouble;
      current += char;
      continue;
    }

    if (!inSingle && !inDouble && char === "`") {
      inBacktick = !inBacktick;
      current += char;
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

function isIgnorableMigrationError(error: unknown) {
  const err = error as { code?: string; errno?: number; message?: string } | null;
  const code = String(err?.code ?? "");
  const errno = Number(err?.errno ?? 0);
  const message = String(err?.message ?? "");

  if (errno === 1050 || code === "ER_TABLE_EXISTS_ERROR") return true;
  if (errno === 1060 || code === "ER_DUP_FIELDNAME") return true;
  if (errno === 1061 || code === "ER_DUP_KEYNAME") return true;
  if (errno === 1091 || code === "ER_CANT_DROP_FIELD_OR_KEY") return true;

  if (message.includes("Duplicate column name")) return true;
  if (message.includes("already exists")) return true;
  return false;
}

async function ensureMigrationsTable(conn: mysql.PoolConnection) {
  await conn.query(
    `CREATE TABLE IF NOT EXISTS \`${MIGRATIONS_TABLE}\` (
      \`name\` varchar(191) NOT NULL COMMENT '迁移文件名',
      \`executed_at\` datetime NOT NULL COMMENT '执行时间',
      PRIMARY KEY (\`name\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

async function acquireMigrationLock(conn: mysql.PoolConnection) {
  const [dbRows] = await conn.query<RowDataPacket[]>("SELECT DATABASE() AS db");
  const dbName = String((dbRows?.[0] as { db?: string | null } | undefined)?.db ?? "");
  const lockName = `doraemon-blog:migrate:${dbName || "unknown"}`;

  const [lockRows] = await conn.query<RowDataPacket[]>(
    "SELECT GET_LOCK(?, ?) AS gotLock",
    [lockName, MIGRATIONS_LOCK_TIMEOUT_SECONDS]
  );
  const gotLock = Number(
    (lockRows?.[0] as { gotLock?: number | string | null } | undefined)?.gotLock ?? 0
  );
  if (gotLock !== 1) {
    throw new Error(`获取数据库迁移锁失败：${lockName}`);
  }

  return lockName;
}

async function releaseMigrationLock(conn: mysql.PoolConnection, lockName: string) {
  await conn.query("SELECT RELEASE_LOCK(?)", [lockName]);
}

function shouldAutoRunMigration(fileName: string) {
  if (!MIGRATION_FILE_RE.test(fileName)) return false;
  if (fileName.includes("_migrate_")) return false;
  return true;
}

function getMigrationSortKey(fileName: string) {
  const match = /^(\d{4}-\d{2}-\d{2})_(.+)\.sql$/.exec(fileName);
  const date = match?.[1] ?? "";
  const rest = match?.[2] ?? fileName;

  let weight = 2;
  if (rest.startsWith("create_")) weight = 0;
  else if (rest.startsWith("alter_")) weight = 1;
  else if (rest.startsWith("migrate_")) weight = 3;

  return { date, weight, rest };
}

export async function runMySqlMigrations(pool: mysql.Pool) {
  const migrationsDir = path.join(process.cwd(), "sql");
  let fileNames: string[];

  try {
    fileNames = await fs.readdir(migrationsDir);
  } catch (error) {
    const err = error as { code?: string } | null;
    if (err?.code === "ENOENT") return;
    throw error;
  }

  const migrationFiles = fileNames
    .filter((name) => name.endsWith(".sql"))
    .filter(shouldAutoRunMigration)
    .sort((a, b) => {
      const ka = getMigrationSortKey(a);
      const kb = getMigrationSortKey(b);
      if (ka.date !== kb.date) return ka.date.localeCompare(kb.date, "en");
      if (ka.weight !== kb.weight) return ka.weight - kb.weight;
      return ka.rest.localeCompare(kb.rest, "en");
    });

  if (!migrationFiles.length) return;

  const conn = await pool.getConnection();
  let lockName: string | null = null;
  try {
    lockName = await acquireMigrationLock(conn);
    await ensureMigrationsTable(conn);

    const [appliedRows] = await conn.query<RowDataPacket[]>(
      `SELECT name FROM \`${MIGRATIONS_TABLE}\``
    );
    const applied = new Set(
      appliedRows
        .map((row) => String((row as { name?: unknown } | undefined)?.name ?? ""))
        .filter(Boolean)
    );

    for (const fileName of migrationFiles) {
      if (applied.has(fileName)) continue;

      const fullPath = path.join(migrationsDir, fileName);
      const content = await fs.readFile(fullPath, "utf8");
      const statements = splitSqlStatements(content);

      for (const statement of statements) {
        const trimmed = statement.trim();
        if (!trimmed) continue;
        try {
          await conn.query(trimmed);
        } catch (error) {
          if (isIgnorableMigrationError(error)) continue;
          const err = error as { message?: string } | null;
          throw new Error(
            `执行迁移失败：${fileName}\nSQL: ${trimmed.slice(0, 200)}\n原因：${String(
              err?.message ?? error
            )}`
          );
        }
      }

      await conn.query(`INSERT INTO \`${MIGRATIONS_TABLE}\` (name, executed_at) VALUES (?, NOW())`, [
        fileName,
      ]);
    }
  } finally {
    if (lockName) {
      try {
        await releaseMigrationLock(conn, lockName);
      } catch {}
    }
    conn.release();
  }
}
