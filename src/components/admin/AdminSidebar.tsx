"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ADMIN_NAV_ITEMS, isAdminNavActive } from "@/components/admin/adminNav";

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-background lg:flex lg:flex-col">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Shield className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">管理后台</div>
          <div className="truncate text-xs text-muted-foreground">Doraemon Blog</div>
        </div>
      </div>

      <Separator />

      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
        <nav className="space-y-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const active = isAdminNavActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <Separator />

      <div className="p-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          返回前台
        </Link>
      </div>
    </aside>
  );
}
