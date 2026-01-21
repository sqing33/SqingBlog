import { NextRequest } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { mysqlGetConnection } from "@/lib/db/mysql";
import { toMySqlDateTime } from "@/lib/date";

export const runtime = "nodejs";

export async function POST(
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

    const [commentRows] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM comment WHERE id = ? FOR UPDATE",
      [id]
    );
    if (!commentRows.length) {
      await conn.rollback();
      return fail("评论不存在", { status: 404, code: "NOT_FOUND" });
    }

    const createTime = toMySqlDateTime();

    const [insertResult] = await conn.execute<ResultSetHeader>(
      "INSERT IGNORE INTO user_comment_like (user_id, comment_id, create_time) VALUES (?,?,?)",
      [session.sub, id, createTime]
    );

    let liked = false;
    if (insertResult.affectedRows === 1) {
      liked = true;
    } else {
      await conn.execute<ResultSetHeader>(
        "DELETE FROM user_comment_like WHERE user_id = ? AND comment_id = ?",
        [session.sub, id]
      );
    }

    const [countRows] = await conn.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS total FROM user_comment_like WHERE comment_id = ?",
      [id]
    );
    const total = Number((countRows?.[0] as { total?: number | string } | undefined)?.total ?? 0);

    await conn.execute<ResultSetHeader>(
      "UPDATE comment SET `like` = ? WHERE id = ?",
      [total, id]
    );

    await conn.commit();
    return ok(
      { liked, like: total },
      { message: liked ? "点赞成功" : "已取消点赞" }
    );
  } catch {
    try {
      await conn.rollback();
    } catch {}
    return fail("点赞失败", { status: 500, code: "DB_ERROR" });
  } finally {
    conn.release();
  }
}
