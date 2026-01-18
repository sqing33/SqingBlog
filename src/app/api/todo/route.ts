import { NextRequest } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { toMySqlDateTime } from "@/lib/date";
import { mysqlExec, mysqlQuery } from "@/lib/db/mysql";
import { SnowflakeId } from "@/lib/id/snowflake";

export const runtime = "nodejs";

type TodoItemRow = RowDataPacket & {
  id: string;
  user_id: string;
  content: string;
  done: number | string;
  sort_index: number | string;
  create_time: string;
  update_time: string;
};

function normalizeTodoItem(row: TodoItemRow) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    content: String(row.content ?? ""),
    done: Boolean(Number(row.done ?? 0)),
    sort_index: Number(row.sort_index ?? 0),
    create_time: String(row.create_time ?? ""),
    update_time: String(row.update_time ?? ""),
  };
}

export async function GET(req: NextRequest) {
  let session;
  try {
    session = requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  try {
    const rows = await mysqlQuery<TodoItemRow>(
      "SELECT id, user_id, content, done, sort_index, create_time, update_time FROM todo_item WHERE user_id = ? ORDER BY done ASC, sort_index DESC, create_time DESC",
      [session.sub]
    );
    const items = rows.map(normalizeTodoItem);
    return ok({ items });
  } catch {
    return fail("查询代办失败", { status: 500, code: "DB_ERROR" });
  }
}

const createSchema = z.object({
  content: z.string().min(1).max(255),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return fail("代办内容不正确", {
      status: 400,
      code: "INVALID_INPUT",
      details: parsed.error.flatten(),
    });
  }

  const content = parsed.data.content.trim();
  if (!content) {
    return fail("请输入内容", { status: 400, code: "INVALID_INPUT" });
  }

  const idGen = new SnowflakeId({ WorkerId: 1 });
  const id = idGen.nextString();
  const now = toMySqlDateTime();
  const sortIndex = Math.floor(Date.now() / 1000);

  try {
    await mysqlExec(
      "INSERT INTO todo_item (id, user_id, content, done, sort_index, create_time, update_time) VALUES (?,?,?,?,?,?,?)",
      [id, session.sub, content, 0, sortIndex, now, now]
    );
    return ok(
      {
        item: {
          id,
          user_id: String(session.sub),
          content,
          done: false,
          sort_index: sortIndex,
          create_time: now,
          update_time: now,
        },
      },
      { status: 201, message: "创建成功" }
    );
  } catch {
    return fail("创建代办失败", { status: 500, code: "DB_ERROR" });
  }
}

