import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { mysqlQuery } from "@/lib/db/mysql";
import { rewriteLegacyAssetHosts } from "@/lib/richtext";

export const runtime = "nodejs";

type UserRow = {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  create_time: string;
  phone: string;
  email: string;
  gender: string | null;
  birthday: string | null;
};

export async function GET(req: NextRequest) {
  let session;
  try {
    session = requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const rows = await mysqlQuery<UserRow>(
    "SELECT id, username, nickname, avatarUrl, create_time, phone, email, gender, birthday FROM users WHERE id = ? LIMIT 1",
    [session.sub]
  );

  const user = rows[0];
  if (!user) return fail("用户不存在", { status: 404, code: "NOT_FOUND" });

  return ok({
    ...user,
    id: String(user.id),
    avatarUrl: user.avatarUrl ? rewriteLegacyAssetHosts(user.avatarUrl) : null,
  });
}

