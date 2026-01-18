import { cookies } from "next/headers";

import { verifySessionToken, type SessionTokenPayload } from "@/lib/auth/jwt";
import { ADMIN_COOKIE, USER_COOKIE } from "@/lib/auth/session";

export async function getUserSession(): Promise<SessionTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = verifySessionToken(token);
    return payload.role === "user" ? payload : null;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<SessionTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = verifySessionToken(token);
    return payload.role === "admin" ? payload : null;
  } catch {
    return null;
  }
}
