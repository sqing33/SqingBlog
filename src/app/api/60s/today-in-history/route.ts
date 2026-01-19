import { fail, ok } from "@/lib/api/response";

export const runtime = "nodejs";

type UpstreamTodayInHistory = {
  data?: {
    date?: string;
    month?: number;
    day?: number;
    items?: Array<{
      title?: string;
      year?: string;
      description?: string;
      event_type?: string;
      link?: string;
    }>;
  };
};

export async function GET() {
  try {
    const res = await fetch("https://60s.viki.moe/v2/today-in-history", {
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!res.ok) {
      return fail("历史上的今天接口请求失败", {
        status: 502,
        code: "UPSTREAM_ERROR",
        details: { status: res.status },
      });
    }

    const json = (await res.json()) as UpstreamTodayInHistory;
    const upstream = json?.data;
    const items = (upstream?.items ?? []).slice(0, 3).map((item) => ({
      title: item?.title,
      year: item?.year,
      link: item?.link,
      description: item?.description,
      eventType: item?.event_type,
    }));

    const response = ok({
      date: upstream?.date,
      month: upstream?.month,
      day: upstream?.day,
      items,
    });
    response.headers.set(
      "Cache-Control",
      "public, max-age=0, s-maxage=86400, stale-while-revalidate=3600"
    );
    return response;
  } catch (err) {
    return fail("历史上的今天接口请求异常", {
      status: 502,
      code: "UPSTREAM_ERROR",
      details: err instanceof Error ? { message: err.message } : err,
    });
  }
}

