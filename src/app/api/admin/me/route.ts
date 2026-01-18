import { NextRequest } from "next/server";

import { ok } from "@/lib/api/response";
import { getTokenFromRequest, ADMIN_COOKIE } from "@/lib/auth/session";
import { verifySessionToken } from "@/lib/auth/jwt";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req, ADMIN_COOKIE);
  if (!token) return ok(null);

  try {
    const payload = verifySessionToken(token);
    if (payload.role !== "admin") return ok(null);
    return ok({ username: payload.username, role: payload.role });
  } catch {
    return ok(null);
  }
}

