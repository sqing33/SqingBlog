"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toClientSafeHtml } from "@/lib/richtext-client";

type FeedbackItem = {
  id: string;
  user_id: string;
  username: string;
  nickname: string;
  content: string;
  create_time: string;
};

export function AdminFeedbackPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<FeedbackItem[]>([]);

  const load = async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/feedback?page=${p}&pageSize=${pageSize}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error("LOAD_FAILED");
      setItems(json.data.feedbackArr || []);
      setTotal(json.data.total || 0);
      setPage(p);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold">反馈管理</h1>
        <div className="mt-1 text-sm text-muted-foreground">
          查看用户反馈与留言内容
        </div>
      </div>

      <Card className="min-h-0 flex-1">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">列表</CardTitle>
          <div className="text-sm text-muted-foreground">
            第 {page} / {totalPages} 页（共 {total} 条）
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex flex-1 flex-col gap-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">加载中...</div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              {items.length ? (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-xl border bg-card p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm">
                          <span className="font-medium">{item.nickname}</span>{" "}
                          <span className="text-muted-foreground">
                            ({item.username}) · {item.user_id}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.create_time}
                        </div>
                      </div>
                      <div
                        className="markdown-body mt-2 bg-transparent text-inherit"
                        dangerouslySetInnerHTML={{ __html: toClientSafeHtml(item.content) }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">暂无数据</div>
              )}
            </div>
          )}

          <div className="flex shrink-0 items-center justify-between gap-2 pt-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => load(Math.max(1, page - 1))}
              type="button"
            >
              上一页
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => load(Math.min(totalPages, page + 1))}
              type="button"
            >
              下一页
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
