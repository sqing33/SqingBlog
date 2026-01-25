import { NextRequest } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { toMySqlDateTime } from "@/lib/date";
import { mysqlGetConnection } from "@/lib/db/mysql";

export const runtime = "nodejs";

const NOTES_GRID_COLS = 48;

type OwnedRow = RowDataPacket & {
  id: string;
};

function normalizeTags(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const trimmed = input
    .map((t) => String(t ?? "").trim())
    .filter(Boolean);

  const unique: string[] = [];
  for (const t of trimmed) {
    if (!unique.includes(t)) unique.push(t);
  }
  if (!unique.length) return null;
  if (unique.length > 3) return null;
  if (unique.some((t) => t.length > 64)) return null;
  return unique;
}

const updateSchema = z
  .object({
    content: z.string().min(1).max(10000).optional(),
    tags: z.array(z.string()).optional(),
    locked: z.boolean().optional(),
    grid: z
      .object({
        x: z.number().int().min(0).max(NOTES_GRID_COLS - 1),
        y: z.number().int().min(0).max(1000000),
        w: z.number().int().min(1).max(NOTES_GRID_COLS),
        h: z.number().int().min(1).max(1000000),
      })
      .optional(),
  })
  .refine(
    (data) =>
      data.content !== undefined ||
      data.tags !== undefined ||
      data.locked !== undefined ||
      data.grid !== undefined,
    { message: "没有需要更新的字段" }
  );

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const { id } = await params;
  if (!id) return fail("缺少 id", { status: 400, code: "INVALID_INPUT" });

  const conn = await mysqlGetConnection();
  try {
    await conn.beginTransaction();

    const [owned] = await conn.query<OwnedRow[]>(
      "SELECT id FROM sticky_note WHERE id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
      [id, session.sub]
    );
    if (!owned.length) {
      await conn.rollback();
      return fail("便签不存在", { status: 404, code: "NOT_FOUND" });
    }

    await conn.execute(
      "DELETE FROM sticky_note_tag WHERE note_id = ? AND user_id = ?",
      [id, session.sub]
    );
    await conn.execute(
      "DELETE FROM sticky_note WHERE id = ? AND user_id = ?",
      [id, session.sub]
    );

    await conn.commit();
    return ok(null, { message: "删除成功" });
  } catch (error) {
    try {
      await conn.rollback();
    } catch {}
    return fail("删除失败", { status: 500, code: "DB_ERROR" });
  } finally {
    conn.release();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const { id } = await params;
  if (!id) return fail("缺少 id", { status: 400, code: "INVALID_INPUT" });

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return fail("便签内容不正确", {
      status: 400,
      code: "INVALID_INPUT",
      details: parsed.error.flatten(),
    });
  }

  const content = parsed.data.content?.trim();
  const tags = parsed.data.tags ? normalizeTags(parsed.data.tags) : undefined;
  const locked = parsed.data.locked;
  const grid = parsed.data.grid;

  if (parsed.data.tags && !tags) {
    return fail("标签格式不正确（最多 3 个）", {
      status: 400,
      code: "INVALID_INPUT",
    });
  }
  if (parsed.data.content && !content) {
    return fail("请输入内容", { status: 400, code: "INVALID_INPUT" });
  }
  if (grid && grid.x + grid.w > NOTES_GRID_COLS) {
    return fail("网格尺寸不正确", { status: 400, code: "INVALID_INPUT" });
  }

  const now = toMySqlDateTime();

  const conn = await mysqlGetConnection();
  try {
    await conn.beginTransaction();

    const [owned] = await conn.query<OwnedRow[]>(
      "SELECT id FROM sticky_note WHERE id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
      [id, session.sub]
    );
    if (!owned.length) {
      await conn.rollback();
      return fail("便签不存在", { status: 404, code: "NOT_FOUND" });
    }

    const updates: string[] = [];
    const params: Array<string | number> = [];

    if (typeof content === "string") {
      updates.push("content = ?");
      params.push(content);
    }
    if (grid) {
      updates.push("grid_x = ?", "grid_y = ?", "grid_w = ?", "grid_h = ?");
      params.push(grid.x, grid.y, grid.w, grid.h);
    }
    if (typeof locked === "boolean") {
      updates.push("layout_locked = ?");
      params.push(locked ? 1 : 0);
    }
    if (tags) {
      updates.push("tag = ?");
      params.push(tags[0]);
    }

    updates.push("update_time = ?");
    params.push(now);

    if (updates.length) {
      await conn.execute(
        `UPDATE sticky_note SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
        [...params, id, session.sub]
      );
    }

    if (tags) {
      await conn.execute(
        "DELETE FROM sticky_note_tag WHERE note_id = ? AND user_id = ?",
        [id, session.sub]
      );
      for (const tag of tags) {
        await conn.execute(
          "INSERT INTO sticky_note_tag (note_id, user_id, tag, create_time) VALUES (?,?,?,?)",
          [id, session.sub, tag, now]
        );
      }
    }

    await conn.commit();
    return ok(null, { message: "更新成功" });
  } catch (error) {
    try {
      await conn.rollback();
    } catch {}
    const message = String((error as { message?: unknown } | null)?.message ?? "");
    const isMissingLockColumn =
      message.includes("Unknown column") && message.includes("layout_locked");
    if (isMissingLockColumn) {
      return fail("数据库缺少 layout_locked 字段，请先执行 sql/2026-01-12_alter_sticky_note_add_layout_locked.sql", {
        status: 500,
        code: "SCHEMA_OUTDATED",
      });
    }
    return fail("更新失败", { status: 500, code: "DB_ERROR" });
  } finally {
    conn.release();
  }
}
