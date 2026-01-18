import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { mysqlQuery } from "@/lib/db/mysql";
import { resolveUploadImageUrl } from "@/lib/uploads";

export const runtime = "nodejs";

type BlogRow = {
  id: string;
  title: string;
  content: string;
  create_time: string;
  coverUrl: string | null;
  category: string;
  user_id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return fail("缺少 id", { status: 400, code: "INVALID_INPUT" });

  try {
    const rows = await mysqlQuery<BlogRow>(
      "SELECT b.*, users.id AS user_id, users.username, users.nickname, users.avatarUrl FROM blog b JOIN user_blog ON b.id = user_blog.blog_id JOIN users ON user_blog.user_id = users.id WHERE b.id = ? LIMIT 1",
      [id]
    );
    if (!rows.length) return fail("帖子不存在", { status: 404, code: "NOT_FOUND" });

    const row = rows[0];
    return ok({
      ...row,
      id: String(row.id),
      user_id: String(row.user_id),
      coverUrl: resolveUploadImageUrl(row.coverUrl, "news"),
      avatarUrl: resolveUploadImageUrl(row.avatarUrl, "avatars"),
    });
  } catch {
    return fail("查询失败", { status: 500, code: "DB_ERROR" });
  }
}
