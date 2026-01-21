import { NextRequest } from "next/server";
import { marked } from "marked";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { isPixhostUrl, uploadToPixhost } from "@/lib/pixhost";

export const runtime = "nodejs";

const DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const FETCH_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";

type TransferRequest = {
  content: string;
};

type TransferResult = {
  content: string;
  replaced: number;
  skipped: number;
  failed: number;
  mappings: Record<string, string>;
};

function withTimeout(timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(id),
  };
}

function guessExtFromContentType(contentType: string | null) {
  const type = (contentType || "").split(";")[0]?.trim().toLowerCase();
  if (!type) return null;
  if (type === "image/jpeg") return "jpg";
  if (type === "image/jpg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  if (type === "image/avif") return "avif";
  if (type === "image/bmp") return "bmp";
  if (type === "image/svg+xml") return "svg";
  return null;
}

function stripAngleBrackets(value: string) {
  const trimmed = (value || "").trim();
  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function resolveDownloadUrl(rawUrl: string) {
  const input = stripAngleBrackets(rawUrl);
  if (!input) return null;
  if (input.startsWith("data:") || input.startsWith("blob:")) return null;
  if (input.startsWith("//")) return `https:${input}`;
  if (input.startsWith("http://") || input.startsWith("https://")) return input;
  try {
    return new URL(input, env.NEXT_PUBLIC_SITE_URL).toString();
  } catch {
    return null;
  }
}

function extractImageUrls(markdown: string) {
  const found = new Set<string>();

  const tokens = marked.lexer(markdown || "", { gfm: true });
  marked.walkTokens(tokens, (token) => {
    if (token.type === "image") {
      const href = (token as { href?: unknown }).href;
      if (typeof href === "string" && href.trim()) {
        found.add(href.trim());
      }
    }
  });

  const htmlImgRe =
    /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi;
  for (const match of markdown.matchAll(htmlImgRe)) {
    const src = match[1] || match[2] || match[3] || "";
    const normalized = String(src || "").trim();
    if (normalized) found.add(normalized);
  }

  return Array.from(found);
}

function safeBasenameFromUrl(value: string) {
  const candidate = stripAngleBrackets(value);
  try {
    const url = new URL(candidate);
    const base = url.pathname.split("/").filter(Boolean).at(-1);
    return base || null;
  } catch {
    const base = candidate.split("/").filter(Boolean).at(-1);
    return base || null;
  }
}

async function downloadImageBlob(downloadUrl: string) {
  const timeout = withTimeout(DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(downloadUrl, {
      headers: {
        "user-agent": FETCH_UA,
        accept: "image/*,*/*;q=0.8",
      },
      signal: timeout.signal,
    });
    if (!res.ok) return null;

    const contentLength = res.headers.get("content-length");
    if (contentLength) {
      const size = Number(contentLength);
      if (!Number.isNaN(size) && size > MAX_IMAGE_BYTES) return null;
    }

    const contentType = res.headers.get("content-type");
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) return null;

    const blob = new Blob([arrayBuffer], {
      type: contentType || "application/octet-stream",
    });

    return { blob, contentType };
  } catch {
    return null;
  } finally {
    timeout.clear();
  }
}

export async function POST(req: NextRequest) {
  try {
    requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const json = (await req.json().catch(() => null)) as TransferRequest | null;
  const content = typeof json?.content === "string" ? json.content : "";
  if (!content.trim()) {
    return ok(
      { content, replaced: 0, skipped: 0, failed: 0, mappings: {} } satisfies TransferResult,
      { status: 200 }
    );
  }

  const urls = extractImageUrls(content);
  if (urls.length === 0) {
    return ok(
      { content, replaced: 0, skipped: 0, failed: 0, mappings: {} } satisfies TransferResult,
      { status: 200 }
    );
  }

  let nextContent = content;
  const mappings: Record<string, string> = {};
  let skipped = 0;
  let failed = 0;

  for (const rawUrl of urls) {
    const sourceUrl = rawUrl.trim();
    if (!sourceUrl) continue;
    if (isPixhostUrl(sourceUrl)) {
      skipped += 1;
      continue;
    }
    if (sourceUrl.startsWith("data:") || sourceUrl.startsWith("blob:")) {
      skipped += 1;
      continue;
    }

    const downloadUrl = resolveDownloadUrl(sourceUrl);
    if (!downloadUrl) {
      failed += 1;
      continue;
    }

    const downloaded = await downloadImageBlob(downloadUrl);
    if (!downloaded) {
      failed += 1;
      continue;
    }

    const base = safeBasenameFromUrl(sourceUrl) || "image";
    const baseNoQuery = base.split(/[?#]/)[0] || base;
    const hasExt = /\.[a-z0-9]{2,8}$/i.test(baseNoQuery);
    const ext = guessExtFromContentType(downloaded.contentType);
    const filename =
      hasExt || !ext ? baseNoQuery : `${baseNoQuery}.${ext}`;

    const showUrl = await uploadToPixhost({
      file: downloaded.blob,
      filename,
    });
    if (!showUrl) {
      failed += 1;
      continue;
    }

    mappings[sourceUrl] = showUrl;
    nextContent = nextContent.replaceAll(sourceUrl, showUrl);
  }

  return ok({
    content: nextContent,
    replaced: Object.keys(mappings).length,
    skipped,
    failed,
    mappings,
  } satisfies TransferResult);
}

