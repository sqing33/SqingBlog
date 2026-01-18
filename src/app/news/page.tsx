import Link from "next/link";

import { env } from "@/lib/env";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type NewsItem = {
  id: string;
  title: string;
  content: string;
  create_time: string;
  coverUrl: string | null;
  category: string;
  state: string | boolean;
};

function stripHtml(html: string) {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(content: string) {
  const text = stripHtml(content);
  if (!text) return "暂无摘要";
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await Promise.resolve(searchParams ?? {});
  const page = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page || "1") || 1;
  const category = Array.isArray(sp.category) ? sp.category[0] : sp.category || "";
  const keyword = Array.isArray(sp.keyword) ? sp.keyword[0] : sp.keyword || "";

  const apiUrl = new URL("/api/news", env.NEXT_PUBLIC_SITE_URL);
  apiUrl.searchParams.set("page", String(Math.max(1, page)));
  apiUrl.searchParams.set("pageSize", "10");
  if (category) apiUrl.searchParams.set("category", category);
  if (keyword) apiUrl.searchParams.set("keyword", keyword);

  let items: NewsItem[] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const res = await fetch(apiUrl, { cache: "no-store" });
    const json = await res.json();
    if (!json?.ok) throw new Error(json?.message || "API_ERROR");
    items = json.data.newsArr ?? [];
    total = json.data.total ?? items.length;
  } catch {
    error = "无法加载新闻数据（请检查 MySQL/环境变量是否已配置）";
  }

  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">新闻活动</h1>
          <p className="text-sm text-muted-foreground">最新动态与活动公告。</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/news" method="get" className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">关键词</label>
              <Input name="keyword" defaultValue={keyword} placeholder="搜索标题/内容" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">分类</label>
              <select
                name="category"
                defaultValue={category}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">全部</option>
                <option value="新闻">新闻</option>
                <option value="娱乐">娱乐</option>
                <option value="公告">公告</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit">搜索</Button>
              <Button asChild variant="secondary">
                <Link href="/news">重置</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {error}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="grid gap-4 p-4 sm:grid-cols-[160px_1fr]">
                <div className="overflow-hidden rounded-lg bg-muted">
                  {item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt=""
                      className="h-32 w-full object-cover sm:h-full"
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center text-xs text-muted-foreground sm:h-full">
                      No Cover
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{item.category}</Badge>
                    <span className="text-xs text-muted-foreground">{item.create_time}</span>
                  </div>
                  <h2 className="text-lg font-semibold leading-snug">
                    <Link href={`/news/${item.id}`} className="hover:underline">
                      {item.title}
                    </Link>
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {excerpt(item.content)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {!items.length ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                暂无新闻
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {!error ? (
        <div className="flex items-center justify-between gap-2">
          <Button asChild variant="outline" disabled={page <= 1}>
            <Link href={`/news?page=${Math.max(1, page - 1)}&keyword=${encodeURIComponent(keyword)}&category=${encodeURIComponent(category)}`}>
              上一页
            </Link>
          </Button>
          <div className="text-sm text-muted-foreground">
            第 {page} / {totalPages} 页（共 {total} 条）
          </div>
          <Button asChild variant="outline" disabled={page >= totalPages}>
            <Link href={`/news?page=${Math.min(totalPages, page + 1)}&keyword=${encodeURIComponent(keyword)}&category=${encodeURIComponent(category)}`}>
              下一页
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

