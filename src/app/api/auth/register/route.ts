import { z } from "zod";

import { fail, ok } from "@/lib/api/response";
import { sha256Hex } from "@/lib/crypto";
import { toMySqlDateTime } from "@/lib/date";
import { mysqlQuery, mysqlExec } from "@/lib/db/mysql";
import { getVerificationCode, deleteVerificationCode } from "@/lib/db/verification";
import { SnowflakeId } from "@/lib/id/snowflake";

export const runtime = "nodejs";

const bodySchema = z.object({
  username: z.string().min(4).max(16),
  password: z.string().min(6).max(64),
  nickname: z.string().min(2).max(20),
  phone: z.string().min(6).max(20),
  email: z.string().email(),
  code: z.string().min(4).max(10),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail("注册信息不完整或格式错误", {
      status: 400,
      code: "INVALID_INPUT",
      details: parsed.error.flatten(),
    });
  }

  const { username, password, nickname, phone, email, code } = parsed.data;

  try {
    const stored = await getVerificationCode(email);
    if (!stored) return fail("验证码已过期或不存在", { status: 400, code: "CODE_EXPIRED" });
    if (stored !== code) return fail("验证码错误", { status: 400, code: "CODE_INVALID" });

    // Cleanup verification code after successful check
    await deleteVerificationCode(email);
  } catch (err) {
    return fail("验证码校验失败", { status: 500, code: "VERIFICATION_ERROR" });
  }

  try {
    const exists = await mysqlQuery<{ id: string }>(
      "SELECT id FROM users WHERE username = ? OR phone = ? OR email = ? LIMIT 1",
      [username, phone, email]
    );
    if (exists.length) {
      return fail("用户已存在（用户名/手机号/邮箱重复）", {
        status: 409,
        code: "USER_EXISTS",
      });
    }

    const idGen = new SnowflakeId({ WorkerId: 1 });
    const id = idGen.nextString();
    const createTime = toMySqlDateTime();
    const passwordHash = sha256Hex(password);

    await mysqlExec(
      "INSERT INTO users (id, username, password, nickname, phone, email, create_time) VALUES (?,?,?,?,?,?,?)",
      [id, username, passwordHash, nickname, phone, email, createTime]
    );

    return ok(
      { id, username, nickname, phone, email, create_time: createTime },
      { message: "注册成功", status: 201 }
    );
  } catch (err) {
    return fail("注册失败", { status: 500, code: "DB_ERROR" });
  }
}

