import { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { mysqlExec, mysqlQuery } from "@/lib/db/mysql";

export const runtime = "nodejs";

type CategoryRow = { name: string };

const fallbackCategories = [
  { label: "分享", value: "分享" },
  { label: "娱乐", value: "娱乐" },
  { label: "杂谈", value: "杂谈" },
];

export async function GET() {
  try {
    const rows = await mysqlQuery<CategoryRow>(
      "SELECT name FROM blog_category ORDER BY name ASC"
    );
    const list = rows
      .map((r) => String(r.name || "").trim())
      .filter(Boolean)
      .map((name) => ({ label: name, value: name }));
    return ok(list.length ? list : fallbackCategories);
  } catch {
    return ok(fallbackCategories);
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(64),
});

export async function POST(req: NextRequest) {
  try {
    requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return fail("分类名称不合法", {
      status: 400,
      code: "INVALID_INPUT",
      details: parsed.error.flatten(),
    });
  }

  const name = parsed.data.name.trim();
  if (!name) {
    return fail("分类名称不能为空", { status: 400, code: "INVALID_INPUT" });
  }

  try {
    await mysqlExec("INSERT IGNORE INTO blog_category (name, create_time) VALUES (?, NOW())", [
      name,
    ]);
    return ok({ label: name, value: name }, { status: 201, message: "创建成功" });
  } catch {
    return fail("创建失败", { status: 500, code: "DB_ERROR" });
  }
}
