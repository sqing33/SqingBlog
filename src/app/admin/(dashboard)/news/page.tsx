import Link from "next/link";

import { AdminNewsPanel } from "@/components/admin/AdminNewsPanel";
import { Button } from "@/components/ui/button";

export default function AdminNewsPage() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">新闻管理</h1>
          <div className="mt-1 text-sm text-muted-foreground">搜索并管理新闻内容</div>
        </div>
        <Button asChild>
          <Link href="/admin/news/new">发布新闻</Link>
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <AdminNewsPanel />
      </div>
    </div>
  );
}
