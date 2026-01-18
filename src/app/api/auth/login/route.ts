import { NextResponse } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/response";
import { isSha256Hex, sha256Hex } from "@/lib/crypto";
import { mysqlQuery } from "@/lib/db/mysql";
import { signSessionToken } from "@/lib/auth/jwt";
import { USER_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

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

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail("请输入账号与密码", {
      status: 400,
      code: "INVALID_INPUT",
      details: parsed.error.flatten(),
    });
  }

  const { identifier, password } = parsed.data;
  const passwordHash = isSha256Hex(password) ? password.toLowerCase() : sha256Hex(password);

  try {
    const rows = await mysqlQuery<UserRow>(
      "SELECT id, username, nickname, avatarUrl, create_time, phone, email, gender, birthday FROM users WHERE (username = ? OR phone = ? OR email = ?) AND password = ? LIMIT 1",
      [identifier, identifier, identifier, passwordHash]
    );

    if (!rows.length) {
      return fail("用户名或密码错误", { status: 401, code: "INVALID_CREDENTIALS" });
    }

    const user = rows[0];
    const token = signSessionToken(
      { sub: String(user.id), username: user.username, role: "user" },
      { expiresIn: "7d" }
    );

    const res = NextResponse.json({ ok: true, message: "登录成功", data: user });
    res.cookies.set(USER_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return fail("登录失败", { status: 500, code: "DB_ERROR" });
  }
}
