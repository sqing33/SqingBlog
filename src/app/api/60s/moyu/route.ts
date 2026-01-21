import { fail, ok } from "@/lib/api/response";

export const runtime = "nodejs";

const MOYU_UPSTREAM_URL = "https://60s.viki.moe/v2/moyu";
const FETCH_REVALIDATE_CAP_SECONDS = 300;
const STALE_REVALIDATE_SECONDS = 60;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function getCstDayKey(nowMs = Date.now()) {
  const offsetMs = 8 * 60 * 60 * 1000;
  const local = new Date(nowMs + offsetMs);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth() + 1;
  const d = local.getUTCDate();
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function secondsUntilNextCstMidnight(nowMs = Date.now()) {
  const offsetMs = 8 * 60 * 60 * 1000;
  const local = new Date(nowMs + offsetMs);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const nextMidnightUtcMs = Date.UTC(y, m, d + 1) - offsetMs;
  const seconds = Math.ceil((nextMidnightUtcMs - nowMs) / 1000);
  return Math.min(86400, Math.max(60, seconds));
}

export async function GET(request: Request) {
  try {
    const debugEnabled =
      process.env.NODE_ENV !== "production" || process.env.DEBUG_MOYU === "1";
    const nowMs = Date.now();
    const expectedCstDay = getCstDayKey(nowMs);
    const baseRevalidateSeconds = secondsUntilNextCstMidnight(nowMs);
    const fetchRevalidateSeconds = Math.min(
      baseRevalidateSeconds,
      FETCH_REVALIDATE_CAP_SECONDS
    );

    const requestUrl = new URL(request.url);
    const requestDay = requestUrl.searchParams.get("day");
    const bypassCache =
      requestUrl.searchParams.has("t") ||
      requestUrl.searchParams.get("noCache") === "1";

    const res = bypassCache
      ? await fetch(MOYU_UPSTREAM_URL, { cache: "no-store" })
      : await fetch(MOYU_UPSTREAM_URL, {
          next: { revalidate: fetchRevalidateSeconds },
        });

    if (!res.ok) {
      if (debugEnabled) {
        console.info(
          `[moyu] upstream error status=${res.status} now=${new Date(nowMs).toISOString()} expectedCstDay=${expectedCstDay} reqDay=${requestDay ?? "-"}`
        );
      }
      return fail("摸鱼接口请求失败", {
        status: 502,
        code: "UPSTREAM_ERROR",
        details: { status: res.status },
      });
    }

    const json = (await res.json()) as { data?: unknown };
    const upstreamDay = String(
      (json as { data?: { date?: { gregorian?: string } } })?.data?.date?.gregorian ??
        ""
    ).slice(0, 10);
    const isUpstreamStale = !upstreamDay || upstreamDay !== expectedCstDay;

    const revalidateSeconds = isUpstreamStale
      ? STALE_REVALIDATE_SECONDS
      : baseRevalidateSeconds;

    if (debugEnabled || isUpstreamStale) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.info(
        `[moyu] now=${new Date(nowMs).toISOString()} tz=${tz ?? "-"} envTZ=${process.env.TZ ?? "-"} expectedCstDay=${expectedCstDay} upstreamDay=${upstreamDay || "-"} stale=${String(isUpstreamStale)} bypassCache=${String(bypassCache)} cacheSeconds=${revalidateSeconds} baseSeconds=${baseRevalidateSeconds} fetchRevalidateSeconds=${fetchRevalidateSeconds} reqDay=${requestDay ?? "-"}`
      );
    }

    const response = ok(json?.data);
    response.headers.set(
      "Cache-Control",
      bypassCache
        ? "no-store"
        : `public, max-age=0, s-maxage=${revalidateSeconds}, stale-while-revalidate=${isUpstreamStale ? 60 : 600}`
    );

    if (debugEnabled) {
      response.headers.set("X-Moyu-Expected-Day", expectedCstDay);
      response.headers.set("X-Moyu-Upstream-Day", upstreamDay || "-");
      response.headers.set("X-Moyu-Stale", String(isUpstreamStale));
      response.headers.set("X-Moyu-Cache-Seconds", String(revalidateSeconds));
      response.headers.set("X-Moyu-Bypass-Cache", String(bypassCache));
      response.headers.set(
        "X-Moyu-Fetch-Revalidate-Seconds",
        bypassCache ? "no-store" : String(fetchRevalidateSeconds)
      );
      response.headers.set(
        "X-Moyu-Server-Now",
        new Date(nowMs).toISOString()
      );
    }

    return response;
  } catch (err) {
    if (process.env.NODE_ENV !== "production" || process.env.DEBUG_MOYU === "1") {
      console.info(
        `[moyu] handler error now=${new Date().toISOString()} message=${err instanceof Error ? err.message : String(err)}`
      );
    }
    return fail("摸鱼接口请求异常", {
      status: 502,
      code: "UPSTREAM_ERROR",
      details: err instanceof Error ? { message: err.message } : err,
    });
  }
}
