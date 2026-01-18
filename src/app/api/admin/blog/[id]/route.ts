import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { mysqlExec } from "@/lib/db/mysql";

export const runtime = "nodejs";

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
