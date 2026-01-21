import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { mysqlExec } from "@/lib/db/mysql";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireSession(req, "admin");
  } catch {
    return fail("需要管理员权限", { status: 401, code: "UNAUTHORIZED" });
  }

  const { id } = await params;
  if (!id) return fail("缺少 id", { status: 400, code: "INVALID_INPUT" });

  const json = await req.json().catch(() => null);
  const pinned = Boolean((json as { pinned?: unknown } | null)?.pinned);

  try {
    if (pinned) {
      await mysqlExec(
        "UPDATE blog SET is_pinned = 1, pinned_time = NOW() WHERE id = ?",
        [id]
      );
      return ok(null, { message: "已置顶" });
    }

    await mysqlExec(
      "UPDATE blog SET is_pinned = 0, pinned_time = NULL WHERE id = ?",
      [id]
    );
    return ok(null, { message: "已取消置顶" });
  } catch {
    return fail("更新失败", { status: 500, code: "DB_ERROR" });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireSession(req, "admin");
  } catch {
    return fail("需要管理员权限", { status: 401, code: "UNAUTHORIZED" });
  }

  const { id } = await params;
  if (!id) return fail("缺少 id", { status: 400, code: "INVALID_INPUT" });

  try {
    await mysqlExec("DELETE FROM comment WHERE bn_id = ? AND category = 'blog'", [id]);
    await mysqlExec("DELETE FROM user_blog_collection WHERE blog_id = ?", [id]);
    await mysqlExec("DELETE FROM user_blog WHERE blog_id = ?", [id]);
    await mysqlExec("DELETE FROM blog WHERE id = ?", [id]);
    return ok(null, { message: "删除成功" });
  } catch {
    return fail("删除失败", { status: 500, code: "DB_ERROR" });
  }
}
