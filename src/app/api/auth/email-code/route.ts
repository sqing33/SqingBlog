import { z } from "zod";

import { fail, ok } from "@/lib/api/response";
import { ensureRedisConnected, redisClient } from "@/lib/db/redis";
import { sendVerificationCode } from "@/lib/email";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail("邮箱格式不正确", {
      status: 400,
      code: "INVALID_INPUT",
      details: parsed.error.flatten(),
    });
  }

  const { email } = parsed.data;
  const code = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");

  try {
    await ensureRedisConnected();
    await redisClient.set(`email_code:${email}`, code, "EX", 60 * 5);
    await sendVerificationCode(email, code);
    return ok(null, { message: "验证码发送成功" });
  } catch (err) {
    const message =
      err instanceof Error && err.message === "EMAIL_NOT_CONFIGURED"
        ? "邮件服务未配置"
        : "验证码发送失败";
    return fail(message, { status: 500, code: "EMAIL_SEND_FAILED" });
  }
}
