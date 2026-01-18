import type { NextRequest } from "next/server";
import { cookies as nextCookies } from "next/headers";

import { verifySessionToken, type SessionTokenPayload } from "@/lib/auth/jwt";

export const USER_COOKIE = "doraemon_token";
export const ADMIN_COOKIE = "doraemon_admin_token";

export function getTokenFromRequest(req: NextRequest, cookieName: string) {
  const bearer = req.headers.get("authorization");
  if (bearer && bearer.toLowerCase().startsWith("bearer ")) {
    return bearer.slice("bearer ".length).trim();
  }
  return req.cookies.get(cookieName)?.value ?? "";
}

export function requireSession(
  req: NextRequest,
  role: "user" | "admin"
): SessionTokenPayload {
  const cookieName = role === "admin" ? ADMIN_COOKIE : USER_COOKIE;
  const token = getTokenFromRequest(req, cookieName);
  if (!token) throw new Error("UNAUTHORIZED");
  const payload = verifySessionToken(token);
  if (payload.role !== role) throw new Error("FORBIDDEN");
  return payload;
}

export async function setServerCookie(
  name: string,
  value: string,
  maxAgeSeconds: number
) {
  const cookieStore = await nextCookies();
  cookieStore.set(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearServerCookie(name: string) {
  const cookieStore = await nextCookies();
  cookieStore.set(name, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
