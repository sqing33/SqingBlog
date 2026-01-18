import { fail, ok } from "@/lib/api/response";
import { mysqlQuery } from "@/lib/db/mysql";

export const runtime = "nodejs";

type TitleRow = {
  title: string | null;
};

export async function GET() {
  try {
    const rows = await mysqlQuery<TitleRow>(
      "SELECT title FROM blog ORDER BY create_time DESC"
    );

    const titles = rows
      .map((row) => (row.title || "").trim())
      .filter(Boolean);

    return ok(titles);
  } catch {
    return fail("查询失败", { status: 500, code: "DB_ERROR" });
  }
}
