import { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/response";
import { mysqlExec, mysqlQuery } from "@/lib/db/mysql";
import { SnowflakeId } from "@/lib/id/snowflake";
import { toMySqlDateTime } from "@/lib/date";
import { requireSession } from "@/lib/auth/session";
import { extractUploadFilename, resolveUploadImageUrl } from "@/lib/uploads";

export const runtime = "nodejs";

type BlogRow = {
  id: string;
  title: string;
  content: string;
  create_time: string;
  coverUrl: string | null;
  category: string;
  layoutType: string | null;
  user_id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
};

function buildWhere(params: {
  category?: string | null;
  keyword?: string | null;
  date?: string | null;
}) {
  const sqlParams: Array<string | number> = [];
  const conditions: string[] = [];

  const category = params.category ?? "";
  const keyword = params.keyword ?? "";
  const date = params.date ?? "";

  if (category && category !== "0") {
    const parts = category
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (parts.length === 1) {
      conditions.push("b.category = ?");
      sqlParams.push(parts[0]!);
    } else if (parts.length > 1) {
      conditions.push(`b.category IN (${parts.map(() => "?").join(",")})`);
      sqlParams.push(...parts);
    }
  }

  if (keyword) {
    conditions.push("(b.title LIKE ? OR b.content LIKE ?)");
    sqlParams.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (date) {
    conditions.push("DATE(b.create_time) = ?");
    sqlParams.push(date);
  }

  const whereSql = conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "";
  return { whereSql, sqlParams };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Number(searchParams.get("page") || "1");
  const pageSizeRaw = searchParams.get("pageSize");
  const pageSize =
    pageSizeRaw === null || pageSizeRaw === "" ? null : Number(pageSizeRaw);
  const category = searchParams.get("category");
  const keyword = searchParams.get("keyword");
  const date = searchParams.get("date") || searchParams.get("create_time");

  if (Number.isNaN(page) || page < 1) {
    return fail("page 参数错误", { status: 400, code: "INVALID_PAGINATION" });
  }
  if (pageSize !== null && (Number.isNaN(pageSize) || pageSize < 1)) {
    return fail("pageSize 参数错误", { status: 400, code: "INVALID_PAGINATION" });
  }

  const { whereSql, sqlParams } = buildWhere({ category, keyword, date });

  const baseQuery = `
    SELECT b.*, u.id AS user_id, u.username, u.nickname, u.avatarUrl
    FROM blog b
    JOIN user_blog ub ON b.id = ub.blog_id
    JOIN users u ON ub.user_id = u.id
  `;

  const limitSql = pageSize === null ? "" : " LIMIT ?, ?";
  const offset = pageSize === null ? 0 : (page - 1) * pageSize;
  const queryParams =
    pageSize === null ? sqlParams : [...sqlParams, offset, pageSize];

  try {
    const blogArr = await mysqlQuery<BlogRow>(
      `${baseQuery}${whereSql} ORDER BY b.create_time DESC${limitSql}`,
      queryParams
    );

    const countRows = await mysqlQuery<{ total: number }>(
      `SELECT COUNT(*) AS total FROM blog b${whereSql}`,
      sqlParams
    );

    const total = countRows?.[0]?.total ?? blogArr.length;

    const normalized = blogArr.map((row) => ({
      ...row,
      id: String(row.id),
      user_id: String(row.user_id),
      coverUrl: resolveUploadImageUrl(row.coverUrl, "news"),
      avatarUrl: resolveUploadImageUrl(row.avatarUrl, "avatars"),
    }));

    return ok({ blogArr: normalized, total });
  } catch (err) {
    return fail("查询失败", { status: 500, code: "DB_ERROR" });
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  category: z.string().min(1).max(255),
  coverUrl: z.string().optional().nullable(),
  layoutType: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  let payload;
  try {
    payload = requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return fail("帖子内容不完整或格式错误", {
      status: 400,
      code: "INVALID_INPUT",
      details: parsed.error.flatten(),
    });
  }

  const { title, content, category, coverUrl, layoutType } = parsed.data;
  const idGen = new SnowflakeId({ WorkerId: 1 });
  const id = idGen.nextString();
  const createTime = toMySqlDateTime();
  const normalizedCover = coverUrl ? extractUploadFilename(coverUrl) : null;
  const normalizedLayout = (layoutType || "").trim() || null;

  try {
    await mysqlExec(
      "INSERT INTO blog (id, title, content, category, coverUrl, layoutType, create_time) VALUES (?,?,?,?,?,?,?)",
      [id, title, content, category, normalizedCover, normalizedLayout, createTime]
    );
    await mysqlExec("INSERT INTO user_blog (user_id, blog_id) VALUES (?,?)", [
      payload.sub,
      id,
    ]);

    return ok({ id }, { status: 201, message: "发布成功" });
  } catch (err) {
    return fail("发布失败", { status: 500, code: "DB_ERROR" });
  }
}
