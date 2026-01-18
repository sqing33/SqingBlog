import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { getTokenFromRequest, USER_COOKIE } from "@/lib/auth/session";
import { verifySessionToken } from "@/lib/auth/jwt";
import { mysqlQuery } from "@/lib/db/mysql";

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
  const token = getTokenFromRequest(req, USER_COOKIE);
  if (!token) return ok(null);

  try {
    const payload = verifySessionToken(token);
    if (payload.role !== "user") return ok(null);

    const rows = await mysqlQuery<UserRow>(
      "SELECT id, username, nickname, avatarUrl, create_time, phone, email, gender, birthday FROM users WHERE id = ? LIMIT 1",
      [payload.sub]
    );
    return ok(rows[0] ?? null);
  } catch {
    return fail("会话无效", { status: 401, code: "INVALID_SESSION" });
  }
}

