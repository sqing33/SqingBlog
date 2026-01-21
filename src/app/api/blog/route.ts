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
  is_pinned: number;
  pinned_time: string | null;
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
      conditions.push("EXISTS (SELECT 1 FROM blog_category_relation bcr WHERE bcr.blog_id = b.id AND bcr.category_name = ?)");
      sqlParams.push(parts[0]!);
    } else if (parts.length > 1) {
      conditions.push(`EXISTS (SELECT 1 FROM blog_category_relation bcr WHERE bcr.blog_id = b.id AND bcr.category_name IN (${parts.map(() => "?").join(",")}))`);
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
    SELECT b.id, b.title, b.content, b.create_time, b.coverUrl, b.is_pinned, b.pinned_time,
           u.id AS user_id, u.username, u.nickname, u.avatarUrl
    FROM blog b
    JOIN user_blog ub ON b.id = ub.blog_id
    JOIN users u ON ub.user_id = u.id
  `;

  const pinnedWhereSql = whereSql
    ? `${whereSql} AND b.is_pinned = 1`
    : " WHERE b.is_pinned = 1";
  const normalWhereSql = whereSql
    ? `${whereSql} AND b.is_pinned = 0`
    : " WHERE b.is_pinned = 0";

  const limitSql = pageSize === null ? "" : " LIMIT ?, ?";
  const offset = pageSize === null ? 0 : (page - 1) * pageSize;
  const queryParams =
    pageSize === null ? sqlParams : [...sqlParams, offset, pageSize];

  try {
    const pinnedArr = await mysqlQuery<BlogRow>(
      `${baseQuery}${pinnedWhereSql} ORDER BY b.pinned_time DESC, b.create_time DESC`,
      sqlParams
    );

    const blogArr = await mysqlQuery<BlogRow>(
      `${baseQuery}${normalWhereSql} ORDER BY b.create_time DESC${limitSql}`,
      queryParams
    );

    const countRows = await mysqlQuery<{ total: number }>(
      `SELECT COUNT(DISTINCT b.id) AS total FROM blog b${normalWhereSql}`,
      sqlParams
    );

    const total = countRows?.[0]?.total ?? blogArr.length;

    const blogIds = Array.from(
      new Set([...pinnedArr, ...blogArr].map((row) => row.id))
    );
    const categoryRelations = blogIds.length > 0
      ? await mysqlQuery<{ blog_id: string; category_name: string }>(
          `SELECT blog_id, category_name FROM blog_category_relation WHERE blog_id IN (${blogIds.map(() => "?").join(",")})`,
          blogIds
        )
      : [];

    const categoryMap = new Map<string, string[]>();
    for (const rel of categoryRelations) {
      const categories = categoryMap.get(rel.blog_id) || [];
      categories.push(rel.category_name);
      categoryMap.set(rel.blog_id, categories);
    }

    const normalizeRow = (row: BlogRow) => {
      const categories = categoryMap.get(row.id) || [];
      const {
        avatarUrl,
        coverUrl,
        is_pinned,
        pinned_time,
        ...rest
      } = row;

      return {
        ...rest,
        id: String(rest.id),
        user_id: String(rest.user_id),
        category: categories.join(","),
        coverUrl: resolveUploadImageUrl(coverUrl, "news"),
        avatarUrl: resolveUploadImageUrl(avatarUrl, "avatars"),
        isPinned: Boolean(is_pinned),
        pinnedTime: pinned_time,
      };
    };

    return ok({
      pinnedArr: pinnedArr.map(normalizeRow),
      blogArr: blogArr.map(normalizeRow),
      total,
    });
  } catch (err) {
    return fail("查询失败", { status: 500, code: "DB_ERROR" });
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  category: z.string().min(1).max(255),
  coverUrl: z.string().optional().nullable(),
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

  const { title, content, category, coverUrl } = parsed.data;
  const idGen = new SnowflakeId({ WorkerId: 1 });
  const id = idGen.nextString();
  const createTime = toMySqlDateTime();
  const normalizedCover = coverUrl ? extractUploadFilename(coverUrl) : null;

  const categories = category
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  try {
    for (const cat of categories) {
      await mysqlExec("INSERT IGNORE INTO blog_category (name, create_time) VALUES (?, ?)", [
        cat,
        createTime,
      ]);
      await mysqlExec(
        "INSERT INTO blog_category_relation (blog_id, category_name, create_time) VALUES (?, ?, ?)",
        [id, cat, createTime]
      );
    }

    await mysqlExec(
      "INSERT INTO blog (id, title, content, coverUrl, create_time) VALUES (?,?,?,?,?)",
      [id, title, content, normalizedCover, createTime]
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

const updateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  category: z.string().min(1).max(255),
  coverUrl: z.string().optional().nullable(),
});

export async function PUT(req: NextRequest) {
  let payload;
  try {
    payload = requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return fail("帖子内容不完整或格式错误", {
      status: 400,
      code: "INVALID_INPUT",
      details: parsed.error.flatten(),
    });
  }

  const { id, title, content, category, coverUrl } = parsed.data;

  try {
    const ownershipRows = await mysqlQuery<{ user_id: string }>(
      "SELECT user_id FROM user_blog WHERE blog_id = ? LIMIT 1",
      [id]
    );

    if (!ownershipRows.length) {
      return fail("帖子不存在", { status: 404, code: "NOT_FOUND" });
    }

    const ownerId = ownershipRows[0]!.user_id;
    if (ownerId !== payload.sub) {
      return fail("无权编辑此帖子", { status: 403, code: "FORBIDDEN" });
    }

    const updateTime = toMySqlDateTime();
    const normalizedCover = coverUrl ? extractUploadFilename(coverUrl) : null;

    const categories = category
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    for (const cat of categories) {
      await mysqlExec("INSERT IGNORE INTO blog_category (name, create_time) VALUES (?, ?)", [
        cat,
        updateTime,
      ]);
    }

    await mysqlExec("DELETE FROM blog_category_relation WHERE blog_id = ?", [id]);

    for (const cat of categories) {
      await mysqlExec(
        "INSERT INTO blog_category_relation (blog_id, category_name, create_time) VALUES (?, ?, ?)",
        [id, cat, updateTime]
      );
    }

    await mysqlExec(
      "UPDATE blog SET title = ?, content = ?, coverUrl = ? WHERE id = ?",
      [title, content, normalizedCover, id]
    );

    return ok({ id }, { status: 200, message: "更新成功" });
  } catch (err) {
    return fail("更新失败", { status: 500, code: "DB_ERROR" });
  }
}
