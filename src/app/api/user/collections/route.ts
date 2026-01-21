import { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { mysqlExec, mysqlQuery } from "@/lib/db/mysql";
import { toMySqlDateTime } from "@/lib/date";
import { resolveUploadImageUrl } from "@/lib/uploads";

export const runtime = "nodejs";

type CollectionRow = {
  blog_id: string;
  title: string;
  coverUrl: string | null;
  collection_time: string;
};

export async function GET(req: NextRequest) {
  let session;
  try {
    session = requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const blogId = (req.nextUrl.searchParams.get("blogId") || "").trim();
  if (blogId) {
    const exists = await mysqlQuery<{ found: number }>(
      "SELECT 1 AS found FROM user_blog_collection WHERE user_id = ? AND blog_id = ? LIMIT 1",
      [session.sub, blogId]
    );
    return ok({ collected: exists.length > 0 });
  }

  const rows = await mysqlQuery<CollectionRow>(
    "SELECT b.title, b.coverUrl, ubc.blog_id, ubc.collection_time FROM blog b JOIN user_blog_collection ubc ON b.id = ubc.blog_id WHERE ubc.user_id = ? ORDER BY ubc.collection_time DESC",
    [session.sub]
  );

  return ok(
    rows.map((r) => ({
      ...r,
      blog_id: String(r.blog_id),
      coverUrl: resolveUploadImageUrl(r.coverUrl, "news"),
    }))
  );
}

const postSchema = z.object({
  blogId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return fail("参数错误", {
      status: 400,
      code: "INVALID_INPUT",
      details: parsed.error.flatten(),
    });
  }

  const createTime = toMySqlDateTime();

  try {
    const result = await mysqlExec(
      "INSERT IGNORE INTO user_blog_collection (blog_id, user_id, collection_time) VALUES (?,?,?)",
      [parsed.data.blogId, session.sub, createTime]
    );

    const affectedRows = Number((result as { affectedRows?: number | string } | null)?.affectedRows ?? 0);
    if (affectedRows === 1) {
      return ok({ collected: true }, { message: "收藏成功", status: 201 });
    }
    return ok({ collected: true }, { message: "已收藏" });
  } catch {
    return fail("收藏失败", { status: 500, code: "DB_ERROR" });
  }
}
