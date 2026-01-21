import { NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/response";
import { requireSession } from "@/lib/auth/session";
import { uploadToPixhost } from "@/lib/pixhost";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    requireSession(req, "user");
  } catch {
    return fail("请先登录", { status: 401, code: "UNAUTHORIZED" });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return fail("上传失败", { status: 400, code: "INVALID_FORM" });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return fail("缺少文件字段 file", { status: 400, code: "MISSING_FILE" });
  }

  const url = await uploadToPixhost({ file, filename: file.name });
  if (!url) {
    return fail("上传失败", { status: 502, code: "PIXHOST_FAILED" });
  }

  return ok({ url }, { status: 201, message: "上传成功" });
}

