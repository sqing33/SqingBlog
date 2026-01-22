import { NextRequest } from "next/server";

import { uploadToPixhost } from "@/lib/pixhost";

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

  // In production (Vercel), we must use external storage (Pixhost)
  // because local filesystem is ephemeral and read-only for uploads.
  // We'll use Pixhost for everything to keep it consistent.

  const timestamp = formatDateTimeForFilename(new Date());
  // Basic cleaning of filename, though Pixhost handles this mostly
  const safeOriginal = file.name.replaceAll(/[^\w.\-()[\] ]+/g, "_");
  const filename = `${folder}_${timestamp}_${safeOriginal}`;

  const uploadedUrl = await uploadToPixhost({
    file,
    filename,
  });

  if (!uploadedUrl) {
    return Response.json({ errno: 1, message: "上传到图床失败" }, { status: 500 });
  }

  return Response.json({
    errno: 0,
    data: {
      url: uploadedUrl,
      alt: "",
      href: filename,
      filename,
    },
  });
}
