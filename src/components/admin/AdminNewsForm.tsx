"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const categories = [
  { label: "新闻", value: "新闻" },
  { label: "娱乐", value: "娱乐" },
  { label: "公告", value: "公告" },
];

export function AdminNewsForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]?.value ?? "新闻");
  const [state, setState] = useState<"true" | "false">("true");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return title.trim() && category.trim() && content.trim() && coverUrl && !saving;
  }, [title, category, content, coverUrl, saving]);

  const uploadCover = async (file: File) => {
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload?folder=news", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || json?.errno !== 0) throw new Error("UPLOAD_FAILED");
      setCoverUrl(json.data.url);
    } catch {
      setMessage("封面上传失败");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/news", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          coverUrl,
          category,
          state,
        }),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error("SAVE_FAILED");
      router.push("/admin/news");
      router.refresh();
    } catch {
      setMessage("发布失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>发布新闻</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {message ? (
          <div className="rounded-md border bg-muted px-3 py-2 text-sm">{message}</div>
        ) : null}

        <div className="space-y-2">
          <Label>标题</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="新闻标题" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>分类</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="请选择" />
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
          <div className="space-y-2">
            <Label>发布状态</Label>
            <Select value={state} onValueChange={(v) => setState(v === "false" ? "false" : "true")}>
              <SelectTrigger>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">已发布</SelectItem>
                <SelectItem value="false">未发布</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>封面</Label>
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
            <div className="overflow-hidden rounded-xl border bg-muted">
              <img src={coverUrl} alt="" className="h-48 w-full object-cover" />
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>内容（支持 Markdown 或 HTML）</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[260px]"
            placeholder="新闻内容"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button disabled={!canSave} onClick={save} type="button">
            {saving ? "发布中..." : "发布"}
          </Button>
          <Button variant="secondary" onClick={() => router.push("/admin/news")} type="button">
            取消
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
