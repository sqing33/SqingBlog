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
};

type StatsRow = {
  posts: number;
  notes: number;
  todos: number;
};

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req, USER_COOKIE);
  if (!token) return ok({ me: null, counts: null });

  const includeStats = req.nextUrl.searchParams.get("includeStats");
  const shouldIncludeStats = includeStats !== "0";

  try {
    const payload = verifySessionToken(token);
    if (payload.role !== "user") return ok({ me: null, counts: null });

    const rows = await mysqlQuery<UserRow>(
      "SELECT id, username, nickname, avatarUrl FROM users WHERE id = ? LIMIT 1",
      [payload.sub]
    );
    const user = rows[0];
    if (!user) return ok({ me: null, counts: null });

    const normalizedAvatar = user.avatarUrl
      ? resolveUploadImageUrl(rewriteLegacyAssetHosts(user.avatarUrl), "avatars")
      : null;

    if (!shouldIncludeStats) {
      return ok({
        me: { ...user, id: String(user.id), avatarUrl: normalizedAvatar },
        counts: null,
      });
    }

    const statsRows = await mysqlQuery<StatsRow>(
      `SELECT
        (SELECT COUNT(*) FROM user_blog WHERE user_id = ?) AS posts,
        (SELECT COUNT(*) FROM sticky_note WHERE user_id = ?) AS notes,
        (SELECT COUNT(*) FROM todo_item WHERE user_id = ?) AS todos`,
      [payload.sub, payload.sub, payload.sub]
    );
    const stats = statsRows?.[0] ?? { posts: 0, notes: 0, todos: 0 };

    const res = ok({
      me: { ...user, id: String(user.id), avatarUrl: normalizedAvatar },
      counts: {
        posts: Number(stats.posts ?? 0),
        notes: Number(stats.notes ?? 0),
        todos: Number(stats.todos ?? 0),
      },
    });
    res.headers.set("cache-control", "private, max-age=10, stale-while-revalidate=60");
    return res;
  } catch {
    return fail("会话无效", { status: 401, code: "INVALID_SESSION" });
  }
}
