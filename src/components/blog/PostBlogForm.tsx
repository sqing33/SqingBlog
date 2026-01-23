"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MarkdownEditor } from "@/components/markdown/MarkdownEditor";
import { CategorySelector } from "@/components/blog/CategorySelector";
import { Plus, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    initialData?.category
      ? initialData.category
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      : [fallbackCategories[0]?.value ?? "分享"],
  );
  const [categorySelectorOpen, setCategorySelectorOpen] = useState(false);
  const [content, setContent] = useState(initialData?.content ?? "");
  const [coverUrl, setCoverUrl] = useState<string | null>(
    initialData?.coverUrl ?? null,
  );
  const [coverInputMode, setCoverInputMode] = useState<"upload" | "url">(
    "upload",
  );
  const [coverUrlInput, setCoverUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingFromUrl, setUploadingFromUrl] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferSummary, setTransferSummary] = useState<string | null>(null);

  const isEditMode = Boolean(initialData?.id);

  const canSubmit = useMemo(() => {
    return (
      title.trim() &&
      selectedCategories.length > 0 &&
      content.trim() &&
      !submitting &&
      !transferring &&
      !uploading &&
      !uploadingFromUrl
    );
  }, [
    title,
    selectedCategories,
    content,
    submitting,
    transferring,
    uploading,
    uploadingFromUrl,
  ]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(media.matches);
    apply();

    if (typeof media.addEventListener === "function")
      media.addEventListener("change", apply);
    else media.addListener(apply);

    return () => {
      if (typeof media.removeEventListener === "function")
        media.removeEventListener("change", apply);
      else media.removeListener(apply);
    };
  }, []);

  const coverPreviewUrl = useMemo(() => {
    if (!coverUrl) return null;
    const value = coverUrl.trim();
    if (!value) return null;
    if (value.startsWith("http://") || value.startsWith("https://"))
      return value;
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
      const json = (await res.json().catch(() => null)) as ApiResponse<{
        url?: string;
      }> | null;
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

  const uploadCoverFromUrl = async (url: string) => {
    setUploadingFromUrl(true);
    setError(null);
    try {
      const res = await fetch("/api/pixhost/upload-from-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const json = (await res.json().catch(() => null)) as ApiResponse<{
        url?: string;
      }> | null;
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const uploadedUrl = json?.data?.url;
      if (
        !res.ok ||
        !json?.ok ||
        typeof uploadedUrl !== "string" ||
        !uploadedUrl.trim()
      ) {
        throw new Error(json?.message || "UPLOAD_FROM_URL_FAILED");
      }
      setCoverUrl(uploadedUrl.trim());
      setCoverUrlInput(uploadedUrl.trim());
    } catch {
      setError("图片链接转存失败");
    } finally {
      setUploadingFromUrl(false);
    }
  };

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCoverUrlInputChange = (value: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setCoverUrlInput(value);

    const trimmedValue = value.trim();
    if (trimmedValue) {
      debounceTimerRef.current = setTimeout(() => {
        uploadCoverFromUrl(trimmedValue);
      }, 800);
    } else {
      setCoverUrl(null);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

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
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "TRANSFER_FAILED");
      const next =
        typeof json.data?.content === "string" ? json.data.content : input;
      const replaced = Number(json.data?.replaced ?? 0);
      const skipped = Number(json.data?.skipped ?? 0);
      const failed = Number(json.data?.failed ?? 0);
      setTransferSummary(
        `已转存 ${replaced} 张，跳过 ${skipped} 张，失败 ${failed} 张`,
      );
      return next;
    } catch {
      setError("图片转存失败");
      return null;
    } finally {
      setTransferring(false);
    }
  };

  const uploadInlineImage = async (file: File) => {
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/pixhost/upload", {
        method: "POST",
        body: form,
      });
      const json = (await res.json().catch(() => null)) as ApiResponse<{
        url?: string;
      }> | null;
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
    }
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      let normalizedContent = content;
      const transferred = await transferContentImages(content);
      if (typeof transferred !== "string") return;
      normalizedContent = transferred;
      setContent(transferred);

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
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || `${method}_FAILED`);
      router.push(`/blog/${json.data.id}`);
    } catch {
      setError(isEditMode ? "更新失败，请稍后重试" : "发布失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="fixed inset-0 z-50 m-0 h-screen w-screen rounded-none border-0">
      <CardContent className="flex h-screen flex-col px-6 pb-6">
        {error ? (
          <div className="flex-none rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm mb-4">
            {error}
          </div>
        ) : null}

        <div className="flex-none grid grid-cols-[140px_1fr_360px_400px_160px_auto] items-start gap-4 mb-4">
          <div className="pt-7">
            <h1 className="text-xl font-semibold">
              {isEditMode ? "编辑帖子" : "发表帖子"}
            </h1>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入标题"
            />
          </div>

          <div className="space-y-2">
            <Label>类型</Label>
            <div className="flex min-h-[42px] flex-wrap gap-2 rounded-md border p-2">
              {selectedCategories.length === 0 ? (
                <span className="text-muted-foreground text-sm">
                  暂未选择类型
                </span>
              ) : (
                selectedCategories.map((cat) => (
                  <Badge key={cat} variant="secondary" className="gap-1 pr-1">
                    {cat}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCategories(
                          selectedCategories.filter((c) => c !== cat),
                        )
                      }
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

          <div className="space-y-2">
            <Label>封面</Label>
            <Tabs
              value={coverInputMode}
              onValueChange={(v) => setCoverInputMode(v as "upload" | "url")}
            >
              <TabsList className="w-full">
                <TabsTrigger value="upload" className="flex-1">
                  上传
                </TabsTrigger>
                <TabsTrigger value="url" className="flex-1">
                  链接
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="mt-2">
                <div className="flex gap-2">
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
                  <Button
                    variant="secondary"
                    onClick={() => setCoverUrl(null)}
                    type="button"
                    size="sm"
                    disabled={!coverPreviewUrl && !uploading}
                    className="w-14"
                  >
                    移除
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="url" className="mt-2">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      value={coverUrlInput}
                      onChange={(e) =>
                        handleCoverUrlInputChange(e.target.value)
                      }
                      placeholder="图片链接"
                      disabled={uploadingFromUrl}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setCoverUrl(null);
                      setCoverUrlInput("");
                    }}
                    type="button"
                    size="sm"
                    disabled={!coverUrlInput && !uploadingFromUrl}
                    className="w-14"
                  >
                    {uploadingFromUrl ? "转存中" : "移除"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label>预览</Label>
            <div className="flex items-center justify-center h-[90px] w-[160px] rounded-md border border-dashed bg-muted">
              {coverUrlInput ? (
                <div className="h-full w-full p-2">
                  <img
                    src={coverUrlInput}
                    alt="封面预览"
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-image.png";
                    }}
                  />
                </div>
              ) : coverPreviewUrl ? (
                <div className="h-full w-full p-2">
                  <img
                    src={coverPreviewUrl}
                    alt="封面预览"
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-image.png";
                    }}
                  />
                </div>
              ) : (
                <div className="text-muted-foreground text-xs text-center px-2">
                  暂无封面
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-7">
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={!canSubmit} onClick={onSubmit} type="button">
                {submitting
                  ? isEditMode
                    ? "更新中..."
                    : "发布中..."
                  : isEditMode
                    ? "更新"
                    : "发布"}
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() =>
                  isEditMode
                    ? router.push(`/blog/${initialData!.id}`)
                    : router.push("/blog")
                }
              >
                取消
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 space-y-2 flex flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Label>内容（Markdown）</Label>
            <div className="flex flex-wrap items-center gap-3">
              {transferSummary ? (
                <span className="text-xs text-muted-foreground">
                  {transferSummary}
                </span>
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
