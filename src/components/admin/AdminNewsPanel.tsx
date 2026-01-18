"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type NewsRow = {
  id: string;
  title: string;
  coverUrl: string | null;
  create_time: string;
  category: string;
  state: string | boolean;
};

export function AdminNewsPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState<NewsRow[]>([]);

  const load = async (kw?: string) => {
    setLoading(true);
    try {
      const api = new URL("/api/admin/news", window.location.origin);
      api.searchParams.set("page", "1");
      api.searchParams.set("pageSize", "50");
      if (kw) api.searchParams.set("keyword", kw);
      const res = await fetch(api.toString(), { cache: "no-store" });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error("LOAD_FAILED");
      setItems(json.data.newsArr || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteNews = async (id: string) => {
    if (!confirm("确认删除该新闻？")) return;
    try {
      const res = await fetch(`/api/admin/news/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error("DELETE_FAILED");
      await load(keyword);
    } catch {
      alert("删除失败");
    }
  };

  return (
    <Card className="min-h-0 flex-1">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">列表</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索标题/内容"
          />
          <Button onClick={() => load(keyword)} type="button">
            搜索
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setKeyword("");
              load("");
            }}
            type="button"
          >
            重置
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">加载中...</div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b text-left">
                  <th className="py-2 pr-2">ID</th>
                  <th className="py-2 pr-2">标题</th>
                  <th className="py-2 pr-2">分类</th>
                  <th className="py-2 pr-2">状态</th>
                  <th className="py-2 pr-2">时间</th>
                  <th className="py-2 pr-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((n) => (
                  <tr key={n.id} className="border-b">
                    <td className="py-2 pr-2">{n.id}</td>
                    <td className="py-2 pr-2">{n.title}</td>
                    <td className="py-2 pr-2">
                      <Badge variant="secondary">{n.category}</Badge>
                    </td>
                    <td className="py-2 pr-2">
                      <Badge variant={String(n.state) === "true" ? "default" : "outline"}>
                        {String(n.state) === "true" ? "已发布" : "未发布"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-2">{n.create_time}</td>
                    <td className="py-2 pr-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteNews(n.id)}
                        type="button"
                      >
                        删除
                      </Button>
                    </td>
                  </tr>
                ))}
                {!items.length ? (
                  <tr>
                    <td
                      className="py-6 text-center text-sm text-muted-foreground"
                      colSpan={6}
                    >
                      暂无数据
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
