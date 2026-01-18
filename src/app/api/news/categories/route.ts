import { ok } from "@/lib/api/response";

export const runtime = "nodejs";

const newsCategories = [
  { label: "新闻", value: "新闻" },
  { label: "娱乐", value: "娱乐" },
  { label: "公告", value: "公告" },
];

export async function GET() {
  return ok(newsCategories);
}

