import { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { mysqlExec } from "@/lib/db/mysql";

export const runtime = "nodejs";

const bodySchema = z.object({
  username: z.string().min(1).max(50),
  nickname: z.string().min(1).max(100),
  phone: z.string().min(1).max(255),
  email: z.string().email(),
  gender: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(), // YYYY-MM-DD
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
    return fail("参数错误", {
      status: 400,
      code: "INVALID_INPUT",
      details: parsed.error.flatten(),
    });
  }

  const { username, nickname, phone, email, gender, birthday } = parsed.data;

  try {
    await mysqlExec(
      "UPDATE users SET username = ?, nickname = ?, phone = ?, email = ?, gender = ?, birthday = ? WHERE id = ?",
      [username, nickname, phone, email, gender ?? null, birthday ?? null, session.sub]
    );
    return ok(null, { message: "修改成功" });
  } catch {
    return fail("修改失败", { status: 500, code: "DB_ERROR" });
  }
}

