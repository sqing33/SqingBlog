import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  MessageSquareText,
  FileText,
  Newspaper,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  title: string;
  icon: LucideIcon;
  match?: "exact" | "prefix";
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", title: "概览", icon: LayoutDashboard, match: "exact" },
  { href: "/admin/users", title: "用户", icon: Users, match: "prefix" },
  { href: "/admin/feedback", title: "反馈", icon: MessageSquareText, match: "prefix" },
  { href: "/admin/blog", title: "帖子", icon: FileText, match: "prefix" },
  { href: "/admin/news", title: "新闻", icon: Newspaper, match: "prefix" },
];

export function isAdminNavActive(pathname: string, item: AdminNavItem) {
  if (item.match === "exact") return pathname === item.href;
  if (pathname === item.href) return true;
  return pathname.startsWith(`${item.href}/`);
}

export function getAdminPageTitle(pathname: string) {
  const prioritized = [
    { href: "/admin/news/new", title: "发布新闻", match: "exact" as const },
    ...ADMIN_NAV_ITEMS,
  ];

  const found = prioritized.find((item) =>
    isAdminNavActive(pathname, item as AdminNavItem)
  );
  return found?.title ?? "后台";
}

