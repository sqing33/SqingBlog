import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { getTokenFromRequest, USER_COOKIE } from "@/lib/auth/session";
import { verifySessionToken } from "@/lib/auth/jwt";
import { mysqlQuery } from "@/lib/db/mysql";
import { rewriteLegacyAssetHosts } from "@/lib/richtext";
import { resolveUploadImageUrl } from "@/lib/uploads";

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
    const user = rows[0];
    if (!user) return ok(null);

    const normalizedAvatar = user.avatarUrl
      ? resolveUploadImageUrl(rewriteLegacyAssetHosts(user.avatarUrl), "avatars")
      : null;

    return ok({
      ...user,
      id: String(user.id),
      avatarUrl: normalizedAvatar,
    });
  } catch {
    return fail("会话无效", { status: 401, code: "INVALID_SESSION" });
  }
}
