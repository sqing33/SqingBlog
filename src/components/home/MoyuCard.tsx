"use client";

import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type MoyuData = {
  date?: {
    gregorian?: string;
    weekday?: string;
    lunar?: {
      yearCN?: string;
      monthCN?: string;
      dayCN?: string;
      zodiac?: string;
      yearGanZhi?: string;
    };
  };
  today?: {
    isWorkday?: boolean;
    isHoliday?: boolean;
    holidayName?: string | null;
  };
  progress?: {
    week?: { percentage?: number };
    month?: { percentage?: number };
    year?: { percentage?: number };
  };
  countdown?: {
    toWeekEnd?: number;
    toFriday?: number;
    toMonthEnd?: number;
    toYearEnd?: number;
  };
  nextWeekend?: { date?: string; weekday?: string; daysUntil?: number };
  nextHoliday?: {
    name?: string;
    until?: number;
    date?: string;
    duration?: number;
  };
  moyuQuote?: string;
};

type TodayInHistoryItem = {
  title?: string;
  year?: string;
  link?: string;
  description?: string;
  eventType?: string;
};

type TodayInHistoryData = {
  date?: string;
  month?: number;
  day?: number;
  items?: TodayInHistoryItem[];
};

function formatEventDate(year?: string, history?: TodayInHistoryData | null) {
  const pad2 = (v: number) => String(v).padStart(2, "0");
  const month = history?.month;
  const day = history?.day;
  if (typeof month !== "number" || typeof day !== "number") return year ?? "-";
  return `${year ?? "-"}.${pad2(month)}.${pad2(day)}`;
}

function getLocalDayKey() {
  const d = new Date();
  const pad2 = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function getLocalMonthDay() {
  const d = new Date();
  return { month: d.getMonth() + 1, day: d.getDate() };
}

function isSameLocalDayByGregorian(gregorian?: string) {
  const date = String(gregorian ?? "").slice(0, 10);
  if (!date) return false;
  return date === getLocalDayKey();
}

function isSameLocalDayByMonthDay(history?: TodayInHistoryData | null) {
  if (!history) return false;
  const { month, day } = getLocalMonthDay();
  if (typeof history.month === "number" && typeof history.day === "number") {
    return history.month === month && history.day === day;
  }
  return false;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function ProgressBar(props: {
  label: string;
  percent: number;
  emoji?: string;
}) {
  const percent = clampPercent(props.percent);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-[#3F3E3E]/80">
        <div className="flex items-center gap-1">
          <span aria-hidden="true">{props.emoji ?? "📊"}</span>
          <span>{props.label}</span>
        </div>
        <span className="font-semibold text-[#3F3E3E]">{percent}%</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-black/10"
        role="progressbar"
        aria-label={props.label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className="h-full rounded-full bg-[#3F3E3E]/70"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function MoyuCard() {
  const [moyu, setMoyu] = useState<MoyuData | null>(null);
  const [moyuError, setMoyuError] = useState<string | null>(null);
  const [moyuLoading, setMoyuLoading] = useState(false);

  const [history, setHistory] = useState<TodayInHistoryData | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const retriedMoyuRef = useRef(false);
  const retriedHistoryRef = useRef(false);

  const loadMoyu = useCallback(
    async (opts?: { signal?: AbortSignal; force?: boolean }) => {
      setMoyuLoading(true);
      setMoyuError(null);

      try {
        const dayKey = getLocalDayKey();
        const cacheKey = `moyu:${dayKey}`;
        if (!opts?.force) {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached) as MoyuData;
            if (isSameLocalDayByGregorian(parsed?.date?.gregorian)) {
              setMoyu(parsed);
              return;
            }
          }
        }

        const url = `/api/60s/moyu?day=${encodeURIComponent(dayKey)}${
          opts?.force ? `&t=${Date.now()}` : ""
        }`;
        const res = await fetch(url, {
          method: "GET",
          cache: "no-store",
          signal: opts?.signal,
        });
        if (!res.ok) throw new Error(`请求失败(${res.status})`);
        const json = (await res.json()) as { ok?: boolean; data?: MoyuData };
        if (!json?.ok) throw new Error("返回数据异常");

        const payload = json?.data ?? null;
        if (
          payload?.date?.gregorian &&
          !isSameLocalDayByGregorian(payload.date.gregorian)
        ) {
          if (!opts?.force && !retriedMoyuRef.current) {
            retriedMoyuRef.current = true;
            await loadMoyu({ signal: opts?.signal, force: true });
            return;
          }
          // Upstream may lag; don't cache a wrong-day payload to avoid "stuck" display.
          setMoyu(payload);
          return;
        }

        setMoyu(json?.data ?? null);
        if (json?.data)
          localStorage.setItem(cacheKey, JSON.stringify(json.data));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setMoyuError(err instanceof Error ? err.message : "请求失败");
      } finally {
        setMoyuLoading(false);
      }
    },
    [],
  );

  const loadHistory = useCallback(
    async (opts?: { signal?: AbortSignal; force?: boolean }) => {
      setHistoryError(null);

      try {
        const cacheKey = `todayInHistory:${getLocalDayKey()}`;
        if (!opts?.force) {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached) as TodayInHistoryData;
            if (isSameLocalDayByMonthDay(parsed)) {
              setHistory(parsed);
              return;
            }
          }
        }

        const res = await fetch("/api/60s/today-in-history", {
          method: "GET",
          cache: "no-store",
          signal: opts?.signal,
        });
        if (!res.ok) throw new Error(`请求失败(${res.status})`);
        const json = (await res.json()) as {
          ok?: boolean;
          data?: TodayInHistoryData;
        };
        if (!json?.ok) throw new Error("返回数据异常");

        const payload = json?.data ?? null;
        if (payload && !isSameLocalDayByMonthDay(payload)) {
          if (!opts?.force && !retriedHistoryRef.current) {
            retriedHistoryRef.current = true;
            await loadHistory({ signal: opts?.signal, force: true });
            return;
          }
          setHistory(payload);
          return;
        }

        setHistory(json?.data ?? null);
        if (json?.data)
          localStorage.setItem(cacheKey, JSON.stringify(json.data));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setHistoryError(err instanceof Error ? err.message : "请求失败");
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadMoyu({ signal: controller.signal });
    void loadHistory({ signal: controller.signal });
    return () => controller.abort();
  }, [loadHistory, loadMoyu]);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/30 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-base font-semibold text-[#3F3E3E]">
            🐟 摸鱼日历
          </div>
          <div className="text-sm text-[#3F3E3E]/75">
            {moyu?.date?.gregorian && moyu?.date?.weekday
              ? `📆 ${moyu.date.gregorian} ${moyu.date.weekday}${
                  moyu?.date?.lunar?.monthCN && moyu?.date?.lunar?.dayCN
                    ? ` · 🌙 ${moyu.date.lunar.monthCN}${moyu.date.lunar.dayCN}`
                    : ""
                }${
                  moyu?.date?.lunar?.zodiac
                    ? ` · ${moyu.date.lunar.zodiac}年`
                    : ""
                }`
              : "📆 摸鱼日历"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadMoyu({ force: true });
            void loadHistory({ force: true });
          }}
          className="shrink-0 text-sm text-[#3F3E3E]/60 hover:text-[#3F3E3E] transition-colors"
        >
          刷新
        </button>
      </div>

      {moyuLoading ? (
        <div className="mt-3 space-y-2">
          <div className="h-4 w-full rounded bg-black/5" />
          <div className="h-4 w-5/6 rounded bg-black/5" />
        </div>
      ) : moyuError ? (
        <div className="mt-3 text-sm text-red-600/90">{moyuError}</div>
      ) : (
        <>
          {moyu?.nextHoliday?.name ? (
            <div className="mt-3 rounded-xl bg-black/5 px-3 py-2 text-sm text-[#3F3E3E]/80">
              <div className="flex items-center justify-between gap-2">
                <div>
                  🎯 距离{moyu.nextHoliday.name}：{" "}
                  <span className="font-semibold text-[#3F3E3E]">
                    {moyu?.nextHoliday?.until ?? "-"}
                  </span>{" "}
                  天
                </div>
                {moyu?.nextHoliday?.date ? (
                  <div className="shrink-0 text-[#3F3E3E]/70">
                    {moyu.nextHoliday.date}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ProgressBar
              emoji="📅"
              label="本周"
              percent={moyu?.progress?.week?.percentage ?? 0}
            />
            <ProgressBar
              emoji="🗓️"
              label="本月"
              percent={moyu?.progress?.month?.percentage ?? 0}
            />
            <ProgressBar
              emoji="📆"
              label="本年"
              percent={moyu?.progress?.year?.percentage ?? 0}
            />
          </div>

          <div className="mt-4 text-base leading-relaxed text-[#3F3E3E]">
            {moyu?.moyuQuote ?? "今天也要摸得优雅一点。"}
          </div>

          {historyError ? (
            <div className="mt-3 text-sm text-red-600/90">{historyError}</div>
          ) : history?.items?.length ? (
            <div className="mt-3 rounded-xl bg-black/5 px-3 py-2">
              <div className="text-xs font-semibold text-[#3F3E3E]/70">
                📜 历史上的今天
              </div>
              <ul className="mt-2 space-y-1 text-sm text-[#3F3E3E]/85">
                {history.items.slice(0, 3).map((item, idx) => (
                  <li
                    key={`${item.year ?? "year"}:${
                      item.title ?? "title"
                    }:${idx}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="shrink-0 font-semibold text-[#3F3E3E]/80 w-[80px] text-right">
                        {formatEventDate(item.year, history)}
                      </div>
                      {item.link ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline"
                          title={item.description ?? item.title ?? ""}
                        >
                          <ExternalLink className="mr-1 inline-block h-3.5 w-3.5 text-[#3F3E3E]/60" />
                          {item.title ?? "-"}
                        </a>
                      ) : (
                        <div title={item.description ?? item.title ?? ""}>
                          {item.title ?? "-"}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
