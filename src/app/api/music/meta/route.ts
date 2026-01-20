import { fail, ok } from "@/lib/api/response";

import { parseFile } from "music-metadata";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const AUDIO_EXTENSIONS = new Set([
  ".mp3",
  ".m4a",
  ".aac",
  ".wav",
  ".ogg",
  ".flac",
  ".webm",
]);

function formatTimestamp(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function extractLyrics(meta: Awaited<ReturnType<typeof parseFile>>) {
  const tags = meta.common.lyrics ?? [];
  const texts = tags
    .map((tag) => {
      if (tag?.text) return String(tag.text).trim();
      const sync = tag?.syncText ?? [];
      if (!sync.length) return null;
      return sync
        .map((line) => {
          const t =
            typeof line.timestamp === "number"
              ? formatTimestamp(line.timestamp)
              : "";
          const prefix = t ? `[${t}] ` : "";
          return `${prefix}${line.text ?? ""}`.trimEnd();
        })
        .join("\n")
        .trim();
    })
    .filter((v): v is string => Boolean(v));

  const lyrics = texts.join("\n\n").trim();
  return lyrics ? lyrics : null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const file = searchParams.get("file");
    if (!file) {
      return fail("缺少参数 file", { status: 400, code: "BAD_REQUEST" });
    }

    const safeFile = path.basename(file);
    if (safeFile !== file) {
      return fail("非法参数 file", { status: 400, code: "BAD_REQUEST" });
    }

    const ext = path.extname(safeFile).toLowerCase();
    if (!AUDIO_EXTENSIONS.has(ext)) {
      return fail("不支持的音频格式", { status: 400, code: "BAD_REQUEST" });
    }

    const filePath = path.join(process.cwd(), "public", "music", safeFile);
    const meta = await parseFile(filePath);

    const picture = meta.common.picture?.[0];
    const coverDataUrl =
      picture?.data && picture?.format
        ? `data:${picture.format};base64,${Buffer.from(picture.data).toString(
            "base64"
          )}`
        : null;

    const embeddedLyrics = extractLyrics(meta);
    let lyrics = embeddedLyrics;
    if (!lyrics) {
      const lrcFile = `${path.basename(safeFile, ext)}.lrc`;
      try {
        const content = await readFile(
          path.join(process.cwd(), "public", "music", lrcFile),
          "utf8"
        );
        const trimmed = content.trim();
        lyrics = trimmed ? trimmed : null;
      } catch {
        // ignore
      }
    }

    const response = ok({
      file: safeFile,
      title: meta.common.title,
      artist: meta.common.artist,
      album: meta.common.album,
      coverDataUrl,
      lyrics,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (err) {
    return fail("音乐信息解析失败", {
      status: 500,
      code: "INTERNAL_ERROR",
      details: err instanceof Error ? { message: err.message } : err,
    });
  }
}
