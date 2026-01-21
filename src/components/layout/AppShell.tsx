"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { BlogTitleWordBackground } from "@/components/layout/BlogTitleWordBackground";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const isAdminRoute = useMemo(() => pathname.startsWith("/admin"), [pathname]);
  const isLoginRoute = useMemo(
    () => pathname === "/login" || pathname === "/admin/login",
    [pathname]
  );

  useEffect(() => {
    const root = document.documentElement;
    root.style.removeProperty("--font-family");
    root.style.removeProperty("--font-title");
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <div className="conta">
      {!isAdminRoute && <BlogTitleWordBackground />}
      <div
        ref={scrollRef}
        className={cn(
          "main-scroll el-scrollbar__wrap relative z-10",
          isLoginRoute && "login-page",
          isAdminRoute && "!overflow-hidden"
        )}
      >
        {children}
      </div>
    </div>
  );
}
