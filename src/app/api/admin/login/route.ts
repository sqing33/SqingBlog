import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/lib/env";
import { fail } from "@/lib/api/response";
import { isSha256Hex, sha256Hex } from "@/lib/crypto";
import { signSessionToken } from "@/lib/auth/jwt";
import { ADMIN_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail("请输入管理员账号与密码", {
      status: 400,
      code: "INVALID_INPUT",
      details: parsed.error.flatten(),
    });
  }

  const { username, password } = parsed.data;
  const passHash = isSha256Hex(password) ? password.toLowerCase() : sha256Hex(password);

  if (username !== env.ADMIN_USERNAME || passHash !== env.ADMIN_PASSWORD_HASH.toLowerCase()) {
    return fail("用户名或密码错误", { status: 401, code: "INVALID_CREDENTIALS" });
  }

  const token = signSessionToken({ sub: "admin", username, role: "admin" }, { expiresIn: "7d" });
  const res = NextResponse.json({ ok: true, message: "登录成功" });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

