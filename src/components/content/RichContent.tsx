import { toSafeHtml, rewriteLegacyAssetHosts } from "@/lib/richtext";

export function RichContent({ content }: { content: string }) {
  const safe = toSafeHtml(rewriteLegacyAssetHosts(content || ""));
  return (
    <div
      className="markdown-body bg-transparent text-inherit"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

