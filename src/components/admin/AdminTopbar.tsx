"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ADMIN_NAV_ITEMS,
  getAdminPageTitle,
  isAdminNavActive,
} from "@/components/admin/adminNav";
import { AdminUserMenu } from "@/components/admin/AdminUserMenu";

export function AdminTopbar({ username }: { username: string }) {
  const pathname = usePathname();
  const title = getAdminPageTitle(pathname);

  return (
    <header className="z-30 border-b bg-background">
      <div className="flex h-14 w-full items-center justify-between gap-3 px-6">
        <div className="flex min-w-0 items-center gap-3">
          <AdminMobileNav />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link href="/admin" className="truncate text-sm font-semibold">
                管理后台
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="truncate text-sm text-muted-foreground">{title}</span>
            </div>
          </div>
        </div>

        <AdminUserMenu username={username} />
      </div>
    </header>
  );
}

function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="lg:hidden"
          aria-label="打开后台导航"
        >
          <Menu className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>后台导航</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ADMIN_NAV_ITEMS.map((item) => {
          const active = isAdminNavActive(pathname, item);
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={item.href}
              asChild
              className={cn(active && "bg-accent text-accent-foreground")}
            >
              <Link href={item.href} className="flex items-center gap-2">
                <Icon className="size-4" />
                {item.title}
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/" className="flex items-center gap-2">
            <ArrowLeft className="size-4" />
            返回前台
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
