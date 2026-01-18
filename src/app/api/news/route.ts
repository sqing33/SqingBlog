import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { mysqlQuery } from "@/lib/db/mysql";
import { rewriteLegacyAssetHosts } from "@/lib/richtext";

export const runtime = "nodejs";

type NewsRow = {
  id: string;
  title: string;
  content: string;
  coverUrl: string | null;
  create_time: string;
  state: string | boolean;
  category: string;
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
    conditions.push("category = ?");
    sqlParams.push(category);
  }

  if (keyword) {
    conditions.push("(title LIKE ? OR content LIKE ?)");
    sqlParams.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (date) {
    conditions.push("DATE(create_time) = ?");
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
  const limitSql = pageSize === null ? "" : " LIMIT ?, ?";
  const offset = pageSize === null ? 0 : (page - 1) * pageSize;
  const queryParams =
    pageSize === null ? sqlParams : [...sqlParams, offset, pageSize];

  try {
    const newsArr = await mysqlQuery<NewsRow>(
      `SELECT * FROM news${whereSql} ORDER BY create_time DESC${limitSql}`,
      queryParams
    );

    const countRows = await mysqlQuery<{ total: number }>(
      `SELECT COUNT(*) AS total FROM news${whereSql}`,
      sqlParams
    );
    const total = countRows?.[0]?.total ?? newsArr.length;

    const normalized = newsArr.map((row) => ({
      ...row,
      id: String(row.id),
      coverUrl: row.coverUrl ? rewriteLegacyAssetHosts(row.coverUrl) : null,
      content: rewriteLegacyAssetHosts(row.content),
    }));

    return ok({ newsArr: normalized, total });
  } catch {
    return fail("查询失败", { status: 500, code: "DB_ERROR" });
  }
}
