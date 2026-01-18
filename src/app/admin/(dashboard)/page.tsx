import { AdminDashboardCharts } from "@/components/admin/AdminDashboardCharts";

export default function AdminHomePage() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold">概览</h1>
        <div className="mt-1 text-sm text-muted-foreground">
          数据统计与趋势看板
        </div>
      </div>

      <AdminDashboardCharts />
    </div>
  );
}
