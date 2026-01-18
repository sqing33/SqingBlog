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
    await mysqlExec(
      "INSERT INTO user_blog_collection (blog_id, user_id, collection_time) VALUES (?,?,?)",
      [parsed.data.blogId, session.sub, createTime]
    );
    return ok(null, { message: "收藏成功", status: 201 });
  } catch {
    // Duplicate collection or DB constraint.
    return ok(null, { message: "已收藏" });
  }
}
