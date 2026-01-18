"use client";

import DOMPurify from "dompurify";
import { marked } from "marked";

export function isProbablyHtml(value?: string | null) {
  return /<\/?[a-z][\s\S]*>/i.test(value || "");
}

export function rewriteLegacyAssetHosts(value: string) {
  return (value || "").replaceAll("http://localhost:3000", "");
}

export function toClientSafeHtml(raw: string) {
  const input = rewriteLegacyAssetHosts(raw || "");
  // Always parse as Markdown (it can include raw HTML blocks as well).
  // This avoids leaving mixed Markdown+HTML content unrendered.
  const html = marked.parse(input || "", { async: false });
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}
