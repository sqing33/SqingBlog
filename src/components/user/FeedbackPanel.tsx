"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toClientSafeHtml } from "@/lib/richtext-client";

type FeedbackItem = {
  id: string;
  content: string;
  create_time: string;
};

function FeedbackContent({ content }: { content: string }) {
  const html = useMemo(() => toClientSafeHtml(content), [content]);
  return (
    <div
      className="markdown-body bg-transparent text-inherit"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function FeedbackPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [content, setContent] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/feedback", { cache: "no-store" });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error("LOAD_FAILED");
      setItems(json.data || []);
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

  const submit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/user/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error("SUBMIT_FAILED");
      setContent("");
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">我的反馈</h1>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">提交反馈</CardTitle>
          <Button size="sm" disabled={submitting || !content.trim()} onClick={submit}>
            {submitting ? "提交中..." : "提交"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="欢迎提出建议/吐槽/想看的功能（支持 Markdown 或 HTML）"
            className="min-h-[140px]"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">历史反馈</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">加载中...</div>
          ) : items.length ? (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border bg-background/70 p-3">
                  <div className="text-xs text-muted-foreground">{item.create_time}</div>
                  <div className="mt-2">
                    <FeedbackContent content={item.content} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">暂无反馈</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

