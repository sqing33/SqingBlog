import { NextRequest } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { toMySqlDateTime } from "@/lib/date";
import { mysqlGetConnection, mysqlExec } from "@/lib/db/mysql";

export const runtime = "nodejs";

type OwnedRow = RowDataPacket & {
  id: string;
};

const updateSchema = z
  .object({
    content: z.string().min(1).max(255).optional(),
    done: z.boolean().optional(),
    sort_index: z.number().int().min(0).max(1000000000).optional(),
  })
  .refine(
    (data) =>
      data.content !== undefined || data.done !== undefined || data.sort_index !== undefined,
    { message: "没有需要更新的字段" }
  );

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
    return fail("代办内容不正确", {
      status: 400,
      code: "INVALID_INPUT",
      details: parsed.error.flatten(),
    });
  }

  const content = parsed.data.content?.trim();
  if (parsed.data.content && !content) {
    return fail("请输入内容", { status: 400, code: "INVALID_INPUT" });
  }

  const done = parsed.data.done;
  const sortIndex = parsed.data.sort_index;
  const now = toMySqlDateTime();

  const conn = await mysqlGetConnection();
  try {
    await conn.beginTransaction();

    const [owned] = await conn.query<OwnedRow[]>(
      "SELECT id FROM todo_item WHERE id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
      [id, session.sub]
    );
    if (!owned.length) {
      await conn.rollback();
      return fail("代办不存在", { status: 404, code: "NOT_FOUND" });
    }

    const updates: string[] = [];
    const paramsList: Array<string | number> = [];

    if (typeof content === "string") {
      updates.push("content = ?");
      paramsList.push(content);
    }
    if (typeof done === "boolean") {
      updates.push("done = ?");
      paramsList.push(done ? 1 : 0);
    }
    if (typeof sortIndex === "number") {
      updates.push("sort_index = ?");
      paramsList.push(sortIndex);
    }

    updates.push("update_time = ?");
    paramsList.push(now);

    await conn.execute(
      `UPDATE todo_item SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      [...paramsList, id, session.sub]
    );

    await conn.commit();
    return ok(null, { message: "更新成功" });
  } catch {
    try {
      await conn.rollback();
    } catch {}
    return fail("更新失败", { status: 500, code: "DB_ERROR" });
  } finally {
    conn.release();
  }
}

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

  try {
    const result = await mysqlExec(
      "DELETE FROM todo_item WHERE id = ? AND user_id = ?",
      [id, session.sub]
    );
    const affectedRows = Number((result as { affectedRows?: unknown } | null)?.affectedRows ?? 0);
    if (!affectedRows) {
      return fail("代办不存在", { status: 404, code: "NOT_FOUND" });
    }
    return ok(null, { message: "删除成功" });
  } catch {
    return fail("删除失败", { status: 500, code: "DB_ERROR" });
  }
}

