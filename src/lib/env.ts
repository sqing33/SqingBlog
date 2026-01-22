import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),

  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_DATABASE: z.string().default("doraemon"),
  DB_SSL: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  SKIP_MIGRATIONS: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),

  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().default(""),

  JWT_SECRET: z.string().min(1).default("change-me-in-production"),

  ADMIN_USERNAME: z.string().default("admin"),
  ADMIN_PASSWORD_HASH: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .default(
      "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
    ),

  EMAIL_HOST: z.string().default("smtp.qq.com"),
  EMAIL_PORT: z.coerce.number().int().positive().default(465),
  EMAIL_SECURE: z.coerce.boolean().default(true),
  EMAIL_USER: z.string().default(""),
  EMAIL_PASS: z.string().default(""),
  EMAIL_FROM_NAME: z.string().default("三青的世界探索"),

  NEXT_PUBLIC_BAIDU_MAP_AK: z.string().default(""),
  NEXT_PUBLIC_BAIDU_MAP_TYPE: z.string().default("WebGL"),

  UPLOADS_DIR: z.string().default("public/uploads"),
});

export const env = envSchema.parse(process.env);
