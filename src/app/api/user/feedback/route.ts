import { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { mysqlExec, mysqlQuery } from "@/lib/db/mysql";
import { toMySqlDateTime } from "@/lib/date";
import { SnowflakeId } from "@/lib/id/snowflake";
import { rewriteLegacyAssetHosts } from "@/lib/richtext";

export const runtime = "nodejs";

type FeedbackRow = {
  id: string;
  user_id: string;
  content: string;
  create_time: string;
};

export async function GET(req: NextRequest) {
  let session;
  try {
    session = requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const rows = await mysqlQuery<FeedbackRow>(
    "SELECT id, user_id, content, create_time FROM feedback WHERE user_id = ? ORDER BY create_time DESC",
    [session.sub]
  );

  return ok(
    rows.map((r) => ({
      ...r,
      id: String(r.id),
      user_id: String(r.user_id),
      content: rewriteLegacyAssetHosts(r.content),
    }))
  );
}

const postSchema = z.object({
  content: z.string().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  let session;
  try {
    session = requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return fail("反馈内容不正确", {
      status: 400,
      code: "INVALID_INPUT",
      details: parsed.error.flatten(),
    });
  }

  const idGen = new SnowflakeId({ WorkerId: 1 });
  const id = idGen.nextString();
  const createTime = toMySqlDateTime();

  try {
    await mysqlExec(
      "INSERT INTO feedback (id, user_id, content, create_time) VALUES (?,?,?,?)",
      [id, session.sub, parsed.data.content, createTime]
    );
    return ok({ id }, { status: 201, message: "反馈成功" });
  } catch {
    return fail("反馈失败", { status: 500, code: "DB_ERROR" });
  }
}

