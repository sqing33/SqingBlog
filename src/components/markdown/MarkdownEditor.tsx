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
  autoHeight = false,
}: {
  value: string;
  onChange: (next: string) => void;
  height?: number;
  preview?: PreviewMode;
  placeholder?: string;
  className?: string;
  autoHeight?: boolean;
}) {
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
        textareaProps={{ placeholder }}
        className={autoHeight ? "flex-1 !h-full" : undefined}
      />
    </div>
  );
}
