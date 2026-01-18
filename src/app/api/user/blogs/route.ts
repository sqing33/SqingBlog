import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
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
};

export async function GET(req: NextRequest) {
  let session;
  try {
    session = requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const rows = await mysqlQuery<BlogRow>(
    "SELECT b.* FROM blog b JOIN user_blog ub ON b.id = ub.blog_id WHERE ub.user_id = ? ORDER BY b.create_time DESC",
    [session.sub]
  );

  return ok(
    rows.map((r) => ({
      ...r,
      id: String(r.id),
      coverUrl: resolveUploadImageUrl(r.coverUrl, "news"),
    }))
  );
}
