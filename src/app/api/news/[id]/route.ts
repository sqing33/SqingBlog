import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { mysqlQuery } from "@/lib/db/mysql";
import { rewriteLegacyAssetHosts } from "@/lib/richtext";

export const runtime = "nodejs";

type NewsRow = {
  id: string;
  title: string;
  content: string;
  coverUrl: string | null;
  create_time: string;
  state: string | boolean;
  category: string;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return fail("缺少 id", { status: 400, code: "INVALID_INPUT" });

  try {
    const rows = await mysqlQuery<NewsRow>(
      "SELECT * FROM news WHERE id = ? LIMIT 1",
      [id]
    );
    if (!rows.length) return fail("新闻不存在", { status: 404, code: "NOT_FOUND" });

    const row = rows[0];
    return ok({
      ...row,
      id: String(row.id),
      coverUrl: row.coverUrl ? rewriteLegacyAssetHosts(row.coverUrl) : null,
      content: rewriteLegacyAssetHosts(row.content),
    });
  } catch {
    return fail("查询失败", { status: 500, code: "DB_ERROR" });
  }
}
