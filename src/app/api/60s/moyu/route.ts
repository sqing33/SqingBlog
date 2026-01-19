import { fail, ok } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET() {
  try {
    const res = await fetch("https://60s.viki.moe/v2/moyu", {
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!res.ok) {
      return fail("摸鱼接口请求失败", {
        status: 502,
        code: "UPSTREAM_ERROR",
        details: { status: res.status },
      });
    }

    const json = (await res.json()) as { data?: unknown };
    const response = ok(json?.data);
    response.headers.set(
      "Cache-Control",
      "public, max-age=0, s-maxage=86400, stale-while-revalidate=3600"
    );
    return response;
  } catch (err) {
    return fail("摸鱼接口请求异常", {
      status: 502,
      code: "UPSTREAM_ERROR",
      details: err instanceof Error ? { message: err.message } : err,
    });
  }
}

