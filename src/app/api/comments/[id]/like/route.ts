import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { mysqlExec } from "@/lib/db/mysql";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const { id } = await params;
  if (!id) return fail("缺少 id", { status: 400, code: "INVALID_INPUT" });

  try {
    await mysqlExec("UPDATE comment SET `like` = `like` + 1 WHERE id = ?", [id]);
    return ok(null, { message: "点赞成功" });
  } catch {
    return fail("点赞失败", { status: 500, code: "DB_ERROR" });
  }
}
