import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest } from "next/server";

import { env } from "@/lib/env";

export const runtime = "nodejs";

type UploadFolder = "news" | "avatars";

function parseUploadFolder(value: string | null): UploadFolder {
  const normalized = (value ?? "news").toLowerCase();
  if (normalized === "avatars") return "avatars";
  return "news";
}

function formatDateTimeForFilename(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return Response.json({ errno: 1, message: "上传失败" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ errno: 1, message: "缺少文件字段 file" }, { status: 400 });
  }

  const folder = parseUploadFolder(req.nextUrl.searchParams.get("folder"));

  const uploadsBase = path.resolve(process.cwd(), env.UPLOADS_DIR);
  const dir = path.join(uploadsBase, "images", folder);
  await fs.mkdir(dir, { recursive: true });

  const timestamp = formatDateTimeForFilename(new Date());
  const random = crypto.randomBytes(8).toString("hex");
  const safeOriginal = file.name.replaceAll(/[^\w.\-()[\] ]+/g, "_");
  const filename = `news_${timestamp}_${random}_${safeOriginal}`;

  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(path.join(dir, filename), Buffer.from(arrayBuffer));

  const url = `/uploads/images/${folder}/${filename}`;
  return Response.json({
    errno: 0,
    data: {
      url,
      alt: "",
      href: filename,
      filename,
    },
  });
}
