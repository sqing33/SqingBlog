import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { mysqlQuery } from "@/lib/db/mysql";
import { rewriteLegacyAssetHosts } from "@/lib/richtext";

export const runtime = "nodejs";

type UserRow = {
  id: string;
  nickname: string;
  username: string;
  password: string;
  avatarUrl: string | null;
  create_time: string;
  email: string;
  gender: string | null;
  birthday: string | null;
  phone: string;
};

export async function GET(req: NextRequest) {
  try {
    requireSession(req, "admin");
  } catch {
    return fail("需要管理员权限", { status: 401, code: "UNAUTHORIZED" });
  }

  const keyword = req.nextUrl.searchParams.get("keyword");

  try {
    let rows: UserRow[];

    if (!keyword) {
      rows = await mysqlQuery<UserRow>("SELECT * FROM users ORDER BY create_time DESC");
    } else {
      const keywordPattern = `%${keyword}%`;
      rows = await mysqlQuery<UserRow>(
        "SELECT * FROM users WHERE id = ? OR username LIKE ? OR nickname LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY create_time DESC",
        [keyword, keywordPattern, keywordPattern, keywordPattern, keywordPattern]
      );
    }

    return ok(
      rows.map((u) => ({
        ...u,
        id: String(u.id),
        avatarUrl: u.avatarUrl ? rewriteLegacyAssetHosts(u.avatarUrl) : null,
      }))
    );
  } catch {
    return fail("查询失败", { status: 500, code: "DB_ERROR" });
  }
}

