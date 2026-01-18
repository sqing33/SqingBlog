import { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { mysqlExec } from "@/lib/db/mysql";
import { rewriteLegacyAssetHosts } from "@/lib/richtext";

export const runtime = "nodejs";

const bodySchema = z.object({
  avatarUrl: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail("avatarUrl 参数错误", {
      status: 400,
      code: "INVALID_INPUT",
      details: parsed.error.flatten(),
    });
  }

  const avatarUrl = rewriteLegacyAssetHosts(parsed.data.avatarUrl);

  try {
    await mysqlExec("UPDATE users SET avatarUrl = ? WHERE id = ?", [
      avatarUrl,
      session.sub,
    ]);
    return ok(null, { message: "修改头像成功" });
  } catch {
    return fail("修改头像失败", { status: 500, code: "DB_ERROR" });
  }
}

