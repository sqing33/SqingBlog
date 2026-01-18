import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { mysqlQuery } from "@/lib/db/mysql";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    requireSession(req, "admin");
  } catch {
    return fail("需要管理员权限", { status: 401, code: "UNAUTHORIZED" });
  }

  try {
    const users = await mysqlQuery<{ total: number }>("SELECT COUNT(*) as total FROM users");
    const blogs = await mysqlQuery<{ total: number }>("SELECT COUNT(*) as total FROM blog");
    const feedback = await mysqlQuery<{ total: number }>(
      "SELECT COUNT(*) as total FROM feedback"
    );

    return ok({
      usercount: users?.[0]?.total ?? 0,
      blogcount: blogs?.[0]?.total ?? 0,
      feedbackcount: feedback?.[0]?.total ?? 0,
    });
  } catch {
    return fail("查询失败", { status: 500, code: "DB_ERROR" });
  }
}

