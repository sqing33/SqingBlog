import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { mysqlQuery } from "@/lib/db/mysql";

export const runtime = "nodejs";

type CountRow = { total: number };

type DateCountRow = {
  date: string;
  total: number;
};

type BlogCategoryRow = {
  category: string | null;
  total: number;
};

type NewsStateRow = {
  state: string | boolean | null;
  total: number;
};

function formatDateLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getRecentDates(days: number) {
  const count = Math.max(1, days);
  const out: string[] = [];
  const today = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(formatDateLocal(d));
  }
  return out;
}

function rowsToMap(rows: DateCountRow[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = String(row.date || "").slice(0, 10);
    if (!key) continue;
    map.set(key, Number(row.total) || 0);
  }
  return map;
}

export async function GET(req: NextRequest) {
  try {
    requireSession(req, "admin");
  } catch {
    return fail("需要管理员权限", { status: 401, code: "UNAUTHORIZED" });
  }

  const daysRaw = Number(req.nextUrl.searchParams.get("days") || "7");
  const days = Math.min(30, Math.max(7, Number.isFinite(daysRaw) ? daysRaw : 7));
  const dates = getRecentDates(days);
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  const sinceDate = formatDateLocal(since);

  try {
    const [usersTotal, blogsTotal, newsTotal, feedbackTotal] = await Promise.all([
      mysqlQuery<CountRow>("SELECT COUNT(*) AS total FROM users"),
      mysqlQuery<CountRow>("SELECT COUNT(*) AS total FROM blog"),
      mysqlQuery<CountRow>("SELECT COUNT(*) AS total FROM news"),
      mysqlQuery<CountRow>("SELECT COUNT(*) AS total FROM feedback"),
    ]);

    const [usersTrend, blogsTrend, newsTrend, feedbackTrend] = await Promise.all([
      mysqlQuery<DateCountRow>(
        "SELECT DATE_FORMAT(create_time, '%Y-%m-%d') AS date, COUNT(*) AS total FROM users WHERE create_time >= ? GROUP BY date ORDER BY date ASC",
        [sinceDate]
      ),
      mysqlQuery<DateCountRow>(
        "SELECT DATE_FORMAT(create_time, '%Y-%m-%d') AS date, COUNT(*) AS total FROM blog WHERE create_time >= ? GROUP BY date ORDER BY date ASC",
        [sinceDate]
      ),
      mysqlQuery<DateCountRow>(
        "SELECT DATE_FORMAT(create_time, '%Y-%m-%d') AS date, COUNT(*) AS total FROM news WHERE create_time >= ? GROUP BY date ORDER BY date ASC",
        [sinceDate]
      ),
      mysqlQuery<DateCountRow>(
        "SELECT DATE_FORMAT(create_time, '%Y-%m-%d') AS date, COUNT(*) AS total FROM feedback WHERE create_time >= ? GROUP BY date ORDER BY date ASC",
        [sinceDate]
      ),
    ]);

    const userMap = rowsToMap(usersTrend);
    const blogMap = rowsToMap(blogsTrend);
    const newsMap = rowsToMap(newsTrend);
    const feedbackMap = rowsToMap(feedbackTrend);

    const trend = {
      dates,
      users: dates.map((d) => userMap.get(d) ?? 0),
      blogs: dates.map((d) => blogMap.get(d) ?? 0),
      news: dates.map((d) => newsMap.get(d) ?? 0),
      feedback: dates.map((d) => feedbackMap.get(d) ?? 0),
    };

    const [blogCategories, newsStates] = await Promise.all([
      mysqlQuery<BlogCategoryRow>(
        "SELECT category, COUNT(*) AS total FROM blog GROUP BY category ORDER BY total DESC LIMIT 12"
      ),
      mysqlQuery<NewsStateRow>(
        "SELECT state, COUNT(*) AS total FROM news GROUP BY state ORDER BY total DESC"
      ),
    ]);

    const categories = blogCategories
      .map((row) => ({
        name: (row.category || "未分类").trim() || "未分类",
        value: Number(row.total) || 0,
      }))
      .filter((item) => item.value > 0);

    const stateLabel = (state: NewsStateRow["state"]) =>
      String(state) === "true" ? "已发布" : "未发布";

    const newsState = newsStates
      .map((row) => ({
        name: stateLabel(row.state),
        value: Number(row.total) || 0,
      }))
      .filter((item) => item.value > 0);

    return ok({
      totals: {
        users: usersTotal?.[0]?.total ?? 0,
        blogs: blogsTotal?.[0]?.total ?? 0,
        news: newsTotal?.[0]?.total ?? 0,
        feedback: feedbackTotal?.[0]?.total ?? 0,
      },
      trend,
      blogCategories: categories,
      newsState,
    });
  } catch {
    return fail("查询失败", { status: 500, code: "DB_ERROR" });
  }
}
