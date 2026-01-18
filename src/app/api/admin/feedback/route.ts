import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { mysqlQuery } from "@/lib/db/mysql";
import { rewriteLegacyAssetHosts } from "@/lib/richtext";

export const runtime = "nodejs";

type FeedbackRow = {
  id: string;
  user_id: string;
  content: string;
  create_time: string;
  username: string;
  nickname: string;
};

export async function GET(req: NextRequest) {
  try {
    requireSession(req, "admin");
  } catch {
    return fail("需要管理员权限", { status: 401, code: "UNAUTHORIZED" });
  }

  const page = Number(req.nextUrl.searchParams.get("page") || "1");
  const pageSize = Number(req.nextUrl.searchParams.get("pageSize") || "10");
  if (Number.isNaN(page) || page < 1 || Number.isNaN(pageSize) || pageSize < 1) {
    return fail("分页参数错误", { status: 400, code: "INVALID_PAGINATION" });
  }

  const offset = (page - 1) * pageSize;

  try {
    const feedbackArr = await mysqlQuery<FeedbackRow>(
      "SELECT feedback.id, feedback.user_id, feedback.content, feedback.create_time, users.username, users.nickname FROM feedback JOIN users ON feedback.user_id = users.id ORDER BY feedback.create_time DESC LIMIT ?, ?",
      [offset, pageSize]
    );

    const totalRows = await mysqlQuery<{ total: number }>(
      "SELECT COUNT(*) AS total FROM feedback"
    );

    return ok({
      feedbackArr: feedbackArr.map((f) => ({
        ...f,
        id: String(f.id),
        user_id: String(f.user_id),
        content: rewriteLegacyAssetHosts(f.content),
      })),
      total: totalRows?.[0]?.total ?? 0,
    });
  } catch {
    return fail("查询失败", { status: 500, code: "DB_ERROR" });
  }
}

