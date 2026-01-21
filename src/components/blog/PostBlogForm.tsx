"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MarkdownEditor } from "@/components/markdown/MarkdownEditor";
import { CategorySelector } from "@/components/blog/CategorySelector";
import { Plus, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

type ApiResponse<T> = { ok?: boolean; data?: T; message?: string };

type CategoryOption = { label: string; value: string };

type BlogInitialData = {
  id: string;
  title: string;
  content: string;
  category: string;
  coverUrl: string | null;
};

const fallbackCategories: CategoryOption[] = [
  { label: "分享", value: "分享" },
  { label: "娱乐", value: "娱乐" },
  { label: "杂谈", value: "杂谈" },
];

type PostBlogFormProps = {
  initialData?: BlogInitialData | null;
};

export function PostBlogForm({ initialData }: PostBlogFormProps = {}) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialData?.category ? initialData.category.split(",").map((c) => c.trim()).filter(Boolean) : [fallbackCategories[0]?.value ?? "分享"]
  );
  const [categorySelectorOpen, setCategorySelectorOpen] = useState(false);
  const [content, setContent] = useState(initialData?.content ?? "");
  const [coverUrl, setCoverUrl] = useState<string | null>(initialData?.coverUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [inlineUploadCount, setInlineUploadCount] = useState(0);
  const [transferring, setTransferring] = useState(false);
  const [transferOnSubmit, setTransferOnSubmit] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferSummary, setTransferSummary] = useState<string | null>(null);

  const isEditMode = Boolean(initialData?.id);

  const inlineUploading = inlineUploadCount > 0;

  const canSubmit = useMemo(() => {
    return title.trim() && selectedCategories.length > 0 && content.trim() && !submitting && !transferring && !inlineUploading;
  }, [title, selectedCategories, content, submitting, transferring, inlineUploading]);

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

  const coverPreviewUrl = useMemo(() => {
    if (!coverUrl) return null;
    const value = coverUrl.trim();
    if (!value) return null;
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    if (value.startsWith("/")) return value;
    return `/uploads/images/news/${value}`;
  }, [coverUrl]);

  const uploadCover = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/pixhost/upload", {
        method: "POST",
        body: form,
      });
      const json = (await res.json().catch(() => null)) as ApiResponse<{ url?: string }> | null;
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const url = json?.data?.url;
      if (!res.ok || !json?.ok || typeof url !== "string" || !url.trim()) {
        throw new Error(json?.message || "UPLOAD_FAILED");
      }
      setCoverUrl(url.trim());
    } catch {
      setError("封面上传失败");
    } finally {
      setUploading(false);
    }
  };

  const transferContentImages = async (input: string) => {
    setTransferring(true);
    setTransferSummary(null);
    setError(null);
    try {
      const res = await fetch("/api/pixhost/transfer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: input }),
      });
      const json = (await res.json().catch(() => null)) as ApiResponse<{
        content?: string;
        replaced?: number;
        skipped?: number;
        failed?: number;
      }> | null;
      if (res.status === 401) {
        router.push("/login");
        return null;
      }
      if (!res.ok || !json?.ok) throw new Error(json?.message || "TRANSFER_FAILED");
      const next = typeof json.data?.content === "string" ? json.data.content : input;
      const replaced = Number(json.data?.replaced ?? 0);
      const skipped = Number(json.data?.skipped ?? 0);
      const failed = Number(json.data?.failed ?? 0);
      setTransferSummary(`已转存 ${replaced} 张，跳过 ${skipped} 张，失败 ${failed} 张`);
      return next;
    } catch {
      setError("图片转存失败");
      return null;
    } finally {
      setTransferring(false);
    }
  };

  const uploadInlineImage = async (file: File) => {
    setInlineUploadCount((prev) => prev + 1);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/pixhost/upload", {
        method: "POST",
        body: form,
      });
      const json = (await res.json().catch(() => null)) as ApiResponse<{ url?: string }> | null;
      if (res.status === 401) {
        router.push("/login");
        return null;
      }
      const url = json?.data?.url;
      if (!res.ok || !json?.ok || typeof url !== "string" || !url.trim()) {
        throw new Error(json?.message || "UPLOAD_FAILED");
      }
      return url.trim();
    } catch {
      setError("图片上传失败");
      return null;
    } finally {
      setInlineUploadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      let normalizedContent = content;
      if (transferOnSubmit) {
        const transferred = await transferContentImages(content);
        if (typeof transferred !== "string") return;
        normalizedContent = transferred;
        setContent(transferred);
      }

      const method = isEditMode ? "PUT" : "POST";
      const body = {
        ...(isEditMode ? { id: initialData!.id } : {}),
        title,
        category: selectedCategories.join(","),
        content: normalizedContent,
        coverUrl,
      };
      const res = await fetch("/api/blog", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error(json?.message || `${method}_FAILED`);
      router.push(`/blog/${json.data.id}`);
    } catch {
      setError(isEditMode ? "更新失败，请稍后重试" : "发布失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="fixed inset-0 z-50 m-0 h-screen w-screen rounded-none border-0">
      <CardHeader className="flex-none px-6 py-4">
        <CardTitle>{isEditMode ? "编辑帖子" : "发表帖子"}</CardTitle>
      </CardHeader>
      <CardContent className="flex h-[calc(100vh-120px)] flex-col space-y-4 overflow-hidden px-6 pb-0 sm:space-y-6">
        {error ? (
          <div className="flex-none rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            {error}
          </div>
        ) : null}

        <div className="flex-none grid gap-4 lg:grid-cols-3 lg:items-start">
          <div className="space-y-2 lg:col-span-1">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入标题"
            />
          </div>

          <div className="space-y-2 lg:col-span-1">
            <Label>类型</Label>
            <div className="flex min-h-[42px] flex-wrap gap-2 rounded-md border p-2">
              {selectedCategories.length === 0 ? (
                <span className="text-muted-foreground text-sm">暂未选择类型</span>
              ) : (
                selectedCategories.map((cat) => (
                  <Badge key={cat} variant="secondary" className="gap-1 pr-1">
                    {cat}
                    <button
                      type="button"
                      onClick={() => setSelectedCategories(selectedCategories.filter((c) => c !== cat))}
                      className="hover:bg-accent/50 rounded-sm p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => setCategorySelectorOpen(true)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-2 lg:col-span-1">
            <Label>封面（可选）</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadCover(file);
                  }}
                />
              </div>
              {coverPreviewUrl ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCoverUrl(null);
                    }}
                    type="button"
                  >
                    移除
                  </Button>
                  <div className="overflow-hidden rounded-xl border bg-muted sm:w-24 sm:h-24 w-full h-24 shrink-0">
                    <img src={coverPreviewUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 space-y-2 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Label>内容（Markdown）</Label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
                <Label className="text-xs text-muted-foreground">发布前转存图片</Label>
                <Switch checked={transferOnSubmit} onCheckedChange={setTransferOnSubmit} />
              </div>
              {inlineUploading ? (
                <span className="text-xs text-muted-foreground">图片上传中...</span>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!content.trim() || transferring || submitting}
                onClick={async () => {
                  const transferred = await transferContentImages(content);
                  if (typeof transferred === "string") setContent(transferred);
                }}
              >
                {transferring ? "转存中..." : "转存图片"}
              </Button>
            </div>
          </div>
          {transferSummary ? (
            <div className="text-xs text-muted-foreground">{transferSummary}</div>
          ) : null}
          <div className="flex-1 min-h-0">
            <MarkdownEditor
              value={content}
              onChange={setContent}
              height={400}
              preview={isMobile ? "edit" : "live"}
              placeholder="把灵感放进时光胶囊，分享给更多人。"
              autoHeight
              uploadImage={uploadInlineImage}
            />
          </div>
        </div>

        <div className="flex-none flex items-center gap-2">
          <Button disabled={!canSubmit} onClick={onSubmit} type="button">
            {submitting ? (isEditMode ? "更新中..." : "发布中...") : (isEditMode ? "更新" : "发布")}
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={() => isEditMode ? router.push(`/blog/${initialData!.id}`) : router.push("/blog")}
          >
            取消
          </Button>
        </div>
      </CardContent>

      <CategorySelector
        open={categorySelectorOpen}
        onOpenChange={setCategorySelectorOpen}
        selectedCategories={selectedCategories}
        onSelectedCategoriesChange={setSelectedCategories}
      />
    </Card>
  );
}
