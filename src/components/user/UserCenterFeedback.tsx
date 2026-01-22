"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
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

export function UserCenterFeedback({ initialItems }: { initialItems: FeedbackItem[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<FeedbackItem[]>(() => initialItems);
  const [content, setContent] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const reload = async () => {
    try {
      const res = await fetch("/api/user/feedback", { cache: "no-store" });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error("LOAD_FAILED");
      setItems((json.data || []) as FeedbackItem[]);
    } catch {
      // ignore
    }
  };

  const submit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/user/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json().catch(() => null);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error("SUBMIT_FAILED");
      setContent("");
      await reload();
    } finally {
      setSubmitting(false);
    }
  };

  const visibleItems = expanded ? items : items.slice(0, 3);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          欢迎提出建议/吐槽/想看的功能（支持 Markdown 或 HTML）
        </div>
        <Button size="sm" disabled={submitting || !content.trim()} onClick={submit}>
          {submitting ? "提交中..." : "提交"}
        </Button>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="例如：文章目录、分类筛选、移动端优化…"
        className="min-h-[120px] bg-transparent/50"
      />

      <div className="space-y-2">
        {visibleItems.length ? (
          visibleItems.map((item) => (
            <div key={item.id} className="rounded-xl border bg-background/40 p-3">
              <div className="text-xs text-muted-foreground">{item.create_time}</div>
              <div className="mt-2">
                <FeedbackContent content={item.content} />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
            暂无反馈
          </div>
        )}
      </div>

      {items.length > 3 ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "收起" : `展开全部（${items.length} 条）`}
        </Button>
      ) : null}
    </div>
  );
}

