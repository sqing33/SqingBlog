"use client";

import dynamic from "next/dynamic";
import type React from "react";

import { cn } from "@/lib/utils";

type PreviewMode = "edit" | "preview" | "live";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

function guessExtFromMime(mime: string) {
  const type = (mime || "").toLowerCase();
  if (type === "image/jpeg") return "jpg";
  if (type === "image/jpg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  if (type === "image/avif") return "avif";
  if (type === "image/bmp") return "bmp";
  if (type === "image/svg+xml") return "svg";
  return "png";
}

function buildPastedFilename(file: File) {
  const raw = (file.name || "").trim();
  const hasExt = /\.[a-z0-9]{2,8}$/i.test(raw);
  if (raw && hasExt) return raw;

  const ext = guessExtFromMime(file.type);
  const base = raw || `pasted_${Date.now()}`;
  return `${base}.${ext}`;
}

function insertAtCursor(textarea: HTMLTextAreaElement, insertText: string) {
  const current = textarea.value || "";
  const start = typeof textarea.selectionStart === "number" ? textarea.selectionStart : current.length;
  const end = typeof textarea.selectionEnd === "number" ? textarea.selectionEnd : start;
  const next = `${current.slice(0, start)}${insertText}${current.slice(end)}`;
  const cursor = start + insertText.length;
  textarea.value = next;
  textarea.focus();
  textarea.setSelectionRange(cursor, cursor);
  return next;
}

export function MarkdownEditor({
  value,
  onChange,
  height = 260,
  preview = "live",
  placeholder,
  className,
  autoHeight = false,
  uploadImage,
}: {
  value: string;
  onChange: (next: string) => void;
  height?: number;
  preview?: PreviewMode;
  placeholder?: string;
  className?: string;
  autoHeight?: boolean;
  uploadImage?: (file: File) => Promise<string | null>;
}) {
  const onPaste: React.ClipboardEventHandler<HTMLTextAreaElement> = async (event) => {
    if (!uploadImage) return;

    const clipboardData = event.clipboardData;
    const items = clipboardData?.items;
    if (!items || items.length === 0) return;

    const plainText = clipboardData.getData("text/plain");
    if (plainText && plainText.trim()) return;

    const imageFiles: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind !== "file") continue;
      if (!item.type || !item.type.startsWith("image/")) continue;
      const file = item.getAsFile();
      if (file) imageFiles.push(file);
    }
    if (imageFiles.length === 0) return;

    event.preventDefault();

    const textarea = event.currentTarget;
    for (const file of imageFiles) {
      const filename = buildPastedFilename(file);
      const url = await uploadImage(new File([file], filename, { type: file.type })).catch(() => null);
      if (!url) continue;
      const nextValue = insertAtCursor(textarea, `![](${url})\n`);
      onChange(nextValue);
    }
  };

  return (
    <div
      data-color-mode="light"
      className={cn("markdown-editor overflow-hidden rounded-xl border bg-white/70", className, autoHeight && "h-full flex flex-col")}
    >
      <MDEditor
        value={value}
        onChange={(next) => onChange(next ?? "")}
        height={autoHeight ? 400 : height}
        preview={preview}
        visibleDragbar={false}
        textareaProps={{ placeholder, onPaste }}
        className={autoHeight ? "flex-1 !h-full" : undefined}
      />
    </div>
  );
}
