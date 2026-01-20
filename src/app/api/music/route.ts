import { fail, ok } from "@/lib/api/response";

import { readdir } from "node:fs/promises";
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

function getDisplayName(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "").trim();
}

export async function GET() {
  try {
    const musicDir = path.join(process.cwd(), "public", "music");
    const entries = await readdir(musicDir, { withFileTypes: true });

    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => {
        const ext = path.extname(name).toLowerCase();
        return AUDIO_EXTENSIONS.has(ext);
      })
      .sort((a, b) => a.localeCompare(b, "zh-CN"));

    const tracks = files.map((file, index) => ({
      id: `${index}`,
      file,
      title: getDisplayName(file),
      url: `/music/${encodeURIComponent(file)}`,
    }));

    const response = ok({ tracks });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (err) {
    return fail("音乐列表获取失败", {
      status: 500,
      code: "INTERNAL_ERROR",
      details: err instanceof Error ? { message: err.message } : err,
    });
  }
}

