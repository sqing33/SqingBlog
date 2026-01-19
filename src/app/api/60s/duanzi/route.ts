import { fail, ok } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const res = await fetch("https://60s.viki.moe/v2/duanzi", {
      cache: "no-store",
    });

    if (!res.ok) {
      return fail("段子接口请求失败", {
        status: 502,
        code: "UPSTREAM_ERROR",
        details: { status: res.status },
      });
    }

    const json = (await res.json()) as { data?: unknown };
    const response = ok(json?.data);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (err) {
    return fail("段子接口请求异常", {
      status: 502,
      code: "UPSTREAM_ERROR",
      details: err instanceof Error ? { message: err.message } : err,
    });
  }
}

