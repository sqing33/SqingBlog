"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkdownEditor } from "@/components/markdown/MarkdownEditor";

const categories = [
  { label: "分享", value: "分享" },
  { label: "娱乐", value: "娱乐" },
  { label: "杂谈", value: "杂谈" },
];

const layoutOptions = [
  { label: "小卡片（两列）", value: "standard" },
  { label: "大卡片（一行一张）", value: "large" },
] as const;

export function PostBlogForm() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]?.value ?? "分享");
  const [layoutType, setLayoutType] = useState<(typeof layoutOptions)[number]["value"]>("standard");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverFilename, setCoverFilename] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return title.trim() && category.trim() && content.trim() && !submitting;
  }, [title, category, content, submitting]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(media.matches);
    apply();

    if (typeof media.addEventListener === "function") media.addEventListener("change", apply);
    else media.addListener(apply);

    return () => {
      if (typeof media.removeEventListener === "function") media.removeEventListener("change", apply);
      else media.removeListener(apply);
    };
  }, []);

  const editorHeight = useMemo(() => (isMobile ? 420 : 620), [isMobile]);

  const uploadCover = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload?folder=news", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok || json?.errno !== 0) throw new Error(json?.message || "UPLOAD_FAILED");
      setCoverUrl(json.data.url);
      setCoverFilename((json?.data?.filename ?? json?.data?.href) || null);
    } catch {
      setError("封面上传失败");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/blog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          content,
          coverUrl: coverFilename,
          layoutType,
        }),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error(json?.message || "POST_FAILED");
      router.push(`/blog/${json.data.id}`);
    } catch {
      setError("发布失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>发表帖子</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-[calc(92px+env(safe-area-inset-bottom))] sm:space-y-6 sm:pb-0">
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
          <div className="space-y-2 lg:col-span-1">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入标题"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-1">
            <div className="min-w-0 space-y-2">
              <Label>类型</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择类型" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-2">
              <Label>列表卡片</Label>
              <Select
                value={layoutType}
                onValueChange={(v) =>
                  setLayoutType(v as (typeof layoutOptions)[number]["value"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择卡片大小" />
                </SelectTrigger>
                <SelectContent>
                  {layoutOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 lg:col-span-1">
            <Label>封面（可选）</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadCover(file);
                }}
              />
              {coverUrl ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCoverUrl(null);
                    setCoverFilename(null);
                  }}
                  type="button"
                >
                  移除封面
                </Button>
              ) : null}
            </div>
            {coverUrl ? (
              <div className="overflow-hidden rounded-xl border bg-muted">
                <img src={coverUrl} alt="" className="h-24 w-full object-cover" />
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label>内容（Markdown）</Label>
          <MarkdownEditor
            value={content}
            onChange={setContent}
            height={editorHeight}
            preview={isMobile ? "edit" : "live"}
            placeholder="把灵感放进时光胶囊，分享给更多人。"
          />
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <Button disabled={!canSubmit} onClick={onSubmit} type="button">
            {submitting ? "发布中..." : "发布"}
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => router.push("/blog")}
          >
            取消
          </Button>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-50 sm:hidden">
          <div className="border-t bg-card/90 backdrop-blur">
            <div className="mx-auto w-full max-w-[1200px] px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
              <div className="flex items-center gap-3">
                <Button className="flex-1" disabled={!canSubmit} onClick={onSubmit} type="button">
                  {submitting ? "发布中..." : "发布"}
                </Button>
                <Button
                  className="flex-1"
                  variant="secondary"
                  type="button"
                  onClick={() => router.push("/blog")}
                >
                  取消
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
