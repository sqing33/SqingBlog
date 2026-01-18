import { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { mysqlExec } from "@/lib/db/mysql";
import { rewriteLegacyAssetHosts } from "@/lib/richtext";

export const runtime = "nodejs";

const updateSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  coverUrl: z.string().min(1),
  category: z.string().min(1).max(255),
  state: z.union([z.boolean(), z.string()]).optional().default(true),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireSession(req, "admin");
  } catch {
    return fail("需要管理员权限", { status: 401, code: "UNAUTHORIZED" });
  }

  const { id } = await params;
  if (!id) return fail("缺少 id", { status: 400, code: "INVALID_INPUT" });

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return fail("参数错误", {
      status: 400,
      code: "INVALID_INPUT",
      details: parsed.error.flatten(),
    });
  }

  const { title, content, coverUrl, category, state } = parsed.data;
  const stateValue =
    typeof state === "boolean" ? String(state) : String(state);

  try {
    await mysqlExec(
      "UPDATE news SET title = ?, content = ?, coverUrl = ?, category = ?, state = ? WHERE id = ?",
      [
        title,
        rewriteLegacyAssetHosts(content),
        rewriteLegacyAssetHosts(coverUrl),
        category,
        stateValue,
        id,
      ]
    );
    return ok(null, { message: "更新成功" });
  } catch {
    return fail("更新失败", { status: 500, code: "DB_ERROR" });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireSession(req, "admin");
  } catch {
    return fail("需要管理员权限", { status: 401, code: "UNAUTHORIZED" });
  }

  const { id } = await params;
  if (!id) return fail("缺少 id", { status: 400, code: "INVALID_INPUT" });

  try {
    await mysqlExec("DELETE FROM comment WHERE bn_id = ? AND category = 'news'", [id]);
    await mysqlExec("DELETE FROM news WHERE id = ?", [id]);
    return ok(null, { message: "删除成功" });
  } catch {
    return fail("删除失败", { status: 500, code: "DB_ERROR" });
  }
}
