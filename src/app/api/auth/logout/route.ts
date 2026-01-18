import { NextResponse } from "next/server";

import { ADMIN_COOKIE, USER_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true, message: "已退出登录" });
  const common = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
  res.cookies.set(USER_COOKIE, "", common);
  res.cookies.set(ADMIN_COOKIE, "", common);
  return res;
}

