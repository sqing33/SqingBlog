import { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { mysqlExec } from "@/lib/db/mysql";
import { isSha256Hex, sha256Hex } from "@/lib/crypto";

export const runtime = "nodejs";

const bodySchema = z.object({
  password: z.string().optional().nullable(),
  phone: z.string().min(1).max(255),
  email: z.string().email(),
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

  const passwordRaw = parsed.data.password ?? "";
  const hasPassword = passwordRaw.trim() !== "";
  const passwordHash = hasPassword
    ? isSha256Hex(passwordRaw)
      ? passwordRaw.toLowerCase()
      : sha256Hex(passwordRaw)
    : "";

  try {
    if (!hasPassword) {
      await mysqlExec("UPDATE users SET phone = ?, email = ? WHERE id = ?", [
        parsed.data.phone,
        parsed.data.email,
        session.sub,
      ]);
    } else {
      await mysqlExec(
        "UPDATE users SET password = ?, phone = ?, email = ? WHERE id = ?",
        [passwordHash, parsed.data.phone, parsed.data.email, session.sub]
      );
    }
    return ok(null, { message: "修改成功" });
  } catch {
    return fail("修改失败", { status: 500, code: "DB_ERROR" });
  }
}

