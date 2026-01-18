"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ApiResponse<T> = { ok?: boolean; data?: T; message?: string };

type StatsSeries = {
  dates: string[];
  users: number[];
  blogs: number[];
  news: number[];
  feedback: number[];
};

type StatsData = {
  totals: {
    users: number;
    blogs: number;
    news: number;
    feedback: number;
  };
  trend: StatsSeries;
  blogCategories: Array<{ name: string; value: number }>;
  newsState: Array<{ name: string; value: number }>;
};

type ChartInstance = {
  setOption: (option: unknown) => void;
  resize: () => void;
  dispose: () => void;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value || 0);
}

export function AdminDashboardCharts() {
  const [days] = useState(14);
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const trendRef = useRef<HTMLDivElement | null>(null);
  const blogCategoryRef = useRef<HTMLDivElement | null>(null);
  const newsStateRef = useRef<HTMLDivElement | null>(null);

  const totals = useMemo(() => data?.totals ?? null, [data]);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/stats?days=${days}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<StatsData>;
      if (!res.ok || !json?.ok || !json?.data) throw new Error("LOAD_FAILED");
      setData(json.data);
    } catch {
      setData(null);
      setMessage("统计数据加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!data) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;

    const init = async () => {
      const echarts = await import("echarts");
      if (disposed) return;

      const charts: ChartInstance[] = [];

      const createChart = (el: HTMLDivElement | null) => {
        if (!el) return null;
        const inst = echarts.init(el) as unknown as ChartInstance;
        charts.push(inst);
        return inst;
      };

      const trend = createChart(trendRef.current);
      const category = createChart(blogCategoryRef.current);
      const state = createChart(newsStateRef.current);

      trend?.setOption({
        tooltip: { trigger: "axis" },
        legend: { top: 8, left: 8 },
        grid: { top: 56, left: 16, right: 16, bottom: 16, containLabel: true },
        xAxis: { type: "category", data: data.trend.dates, axisTick: { alignWithLabel: true } },
        yAxis: { type: "value", minInterval: 1 },
        series: [
          { name: "用户", type: "line", smooth: true, symbol: "circle", symbolSize: 6, data: data.trend.users },
          { name: "帖子", type: "line", smooth: true, symbol: "circle", symbolSize: 6, data: data.trend.blogs },
          { name: "新闻", type: "line", smooth: true, symbol: "circle", symbolSize: 6, data: data.trend.news },
          { name: "反馈", type: "line", smooth: true, symbol: "circle", symbolSize: 6, data: data.trend.feedback },
        ],
      });

      category?.setOption({
        tooltip: { trigger: "item" },
        legend: { bottom: 8, left: "center" },
        series: [
          {
            name: "帖子分类",
            type: "pie",
            radius: ["35%", "70%"],
            avoidLabelOverlap: true,
            itemStyle: { borderRadius: 8, borderColor: "#fff", borderWidth: 2 },
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" } },
            labelLine: { show: false },
            data: data.blogCategories,
          },
        ],
      });

      state?.setOption({
        tooltip: { trigger: "item" },
        legend: { bottom: 8, left: "center" },
        series: [
          {
            name: "新闻状态",
            type: "pie",
            radius: ["35%", "70%"],
            avoidLabelOverlap: true,
            itemStyle: { borderRadius: 8, borderColor: "#fff", borderWidth: 2 },
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" } },
            labelLine: { show: false },
            data: data.newsState,
          },
        ],
      });

      const resize = () => charts.forEach((c) => c.resize());
      window.addEventListener("resize", resize);

      cleanup = () => {
        window.removeEventListener("resize", resize);
        charts.forEach((c) => c.dispose());
      };
    };

    init();

    return () => {
      disposed = true;
      if (cleanup) cleanup();
    };
  }, [data]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <div className="text-sm font-semibold">数据看板</div>
          <div className="mt-1 text-xs text-muted-foreground">近 {days} 天趋势与分布</div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} type="button">
          <RefreshCw className="size-4" />
          刷新
        </Button>
      </div>

      {message ? (
        <div className="shrink-0 text-sm text-muted-foreground">{message}</div>
      ) : null}

      <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="用户" value={totals ? formatNumber(totals.users) : loading ? "…" : "0"} />
        <MetricCard title="帖子" value={totals ? formatNumber(totals.blogs) : loading ? "…" : "0"} />
        <MetricCard title="新闻" value={totals ? formatNumber(totals.news) : loading ? "…" : "0"} />
        <MetricCard title="反馈" value={totals ? formatNumber(totals.feedback) : loading ? "…" : "0"} />
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-3">
        <Card className="min-h-0 lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">趋势</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            <div ref={trendRef} className="h-full min-h-[280px] w-full" />
          </CardContent>
        </Card>

        <div className="grid min-h-0 gap-4 md:grid-cols-2 lg:grid-cols-1">
          <Card className="min-h-0">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">帖子分类</CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1">
              <div ref={blogCategoryRef} className="h-full min-h-[220px] w-full" />
            </CardContent>
          </Card>
          <Card className="min-h-0">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">新闻状态</CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1">
              <div ref={newsStateRef} className="h-full min-h-[220px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="space-y-0">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold leading-none">{value}</div>
      </CardContent>
    </Card>
  );
}
