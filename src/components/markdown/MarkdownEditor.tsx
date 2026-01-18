"use client";

import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";

type PreviewMode = "edit" | "preview" | "live";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

export function MarkdownEditor({
  value,
  onChange,
  height = 260,
  preview = "live",
  placeholder,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  height?: number;
  preview?: PreviewMode;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div
      data-color-mode="light"
      className={cn("markdown-editor overflow-hidden rounded-xl border bg-white/70", className)}
    >
      <MDEditor
        value={value}
        onChange={(next) => onChange(next ?? "")}
        height={height}
        preview={preview}
        visibleDragbar={false}
        textareaProps={{ placeholder }}
      />
    </div>
  );
}
