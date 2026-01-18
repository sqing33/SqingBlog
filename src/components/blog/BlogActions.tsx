"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function BlogActions({ blogId }: { blogId: string }) {
  const router = useRouter();
  const [hint, setHint] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setHint("已复制链接");
      setTimeout(() => setHint(null), 1500);
    } catch {
      setHint("复制失败");
      setTimeout(() => setHint(null), 1500);
    }
  };

  const collect = async () => {
    setCollecting(true);
    setHint(null);
    try {
      const res = await fetch("/api/user/collections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blogId }),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error("COLLECT_FAILED");
      setHint(json?.message || "已收藏");
      setTimeout(() => setHint(null), 1500);
    } catch {
      setHint("收藏失败");
      setTimeout(() => setHint(null), 1500);
    } finally {
      setCollecting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      <Button size="sm" variant="secondary" type="button" onClick={share}>
        分享
      </Button>
      <Button
        size="sm"
        type="button"
        variant="default"
        disabled={collecting}
        onClick={collect}
      >
        {collecting ? "收藏中..." : "收藏"}
      </Button>
    </div>
  );
}

