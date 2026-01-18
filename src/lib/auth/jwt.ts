import jwt from "jsonwebtoken";

import { env } from "@/lib/env";

export type UserRole = "user" | "admin";

export type SessionTokenPayload = {
  sub: string; // user id
  username: string;
  role: UserRole;
};

export function signSessionToken(
  payload: SessionTokenPayload,
  options?: Pick<jwt.SignOptions, "expiresIn">
) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: options?.expiresIn ?? "7d",
  });
}

export function verifySessionToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as SessionTokenPayload;
}
