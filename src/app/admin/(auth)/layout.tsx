import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-10">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">管理后台</div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/">返回前台</Link>
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}

