import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { isPixhostUrl, uploadToPixhost } from "@/lib/pixhost";

export const runtime = "nodejs";

const DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const FETCH_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";

type UploadFromUrlRequest = {
  url: string;
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
  return null;
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

  const json = (await req.json().catch(() => null)) as UploadFromUrlRequest | null;
  const url = typeof json?.url === "string" ? json.url.trim() : "";
  if (!url) {
    return fail("缺少 URL 参数", { status: 400, code: "MISSING_URL" });
  }

  if (isPixhostUrl(url)) {
    return ok({ url }, { status: 200, message: "已是图床链接" });
  }

  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return fail("不支持的 URL 类型", { status: 400, code: "UNSUPPORTED_URL_TYPE" });
  }

  const downloadUrl = resolveDownloadUrl(url);
  if (!downloadUrl) {
    return fail("无效的 URL", { status: 400, code: "INVALID_URL" });
  }

  const downloaded = await downloadImageBlob(downloadUrl);
  if (!downloaded) {
    return fail("图片下载失败或超过大小限制（12MB）", { status: 400, code: "DOWNLOAD_FAILED" });
  }

  const base = safeBasenameFromUrl(url) || "image";
  const baseNoQuery = base.split(/[?#]/)[0] || base;
  const hasExt = /\.[a-z0-9]{2,8}$/i.test(baseNoQuery);
  const ext = guessExtFromContentType(downloaded.contentType);
  const filename = hasExt || !ext ? baseNoQuery : `${baseNoQuery}.${ext}`;

  const showUrl = await uploadToPixhost({
    file: downloaded.blob,
    filename,
  });
  if (!showUrl) {
    return fail("上传失败", { status: 502, code: "PIXHOST_FAILED" });
  }

  return ok({ url: showUrl }, { status: 201, message: "转存成功" });
}