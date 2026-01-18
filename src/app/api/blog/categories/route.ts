import { ok } from "@/lib/api/response";

export const runtime = "nodejs";

const blogCategories = [
  { label: "分享", value: "分享" },
  { label: "娱乐", value: "娱乐" },
  { label: "杂谈", value: "杂谈" },
];

export async function GET() {
  return ok(blogCategories);
}

