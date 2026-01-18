import nodemailer from "nodemailer";

import { env } from "@/lib/env";

export async function sendVerificationCode(email: string, code: string) {
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    throw new Error("EMAIL_NOT_CONFIGURED");
  }

  const transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_SECURE,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASS,
    },
  });

  const fromName = env.EMAIL_FROM_NAME || "哆啦A梦世界探索";

  await transporter.sendMail({
    from: `${fromName} <${env.EMAIL_USER}>`,
    to: email,
    subject: fromName,
    text: `欢迎访问哆啦A梦世界探索网站，您的验证码是：${code}，有效期为2分钟。`,
  });
}

