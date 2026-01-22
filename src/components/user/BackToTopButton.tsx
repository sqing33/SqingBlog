"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getScrollContainer() {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(".main-scroll");
}

export function BackToTopButton({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = getScrollContainer();
    const target: HTMLElement | Window = container || window;

    const getScrollTop = () =>
      container ? container.scrollTop : window.scrollY || document.documentElement.scrollTop;

    const onScroll = () => {
      setVisible(getScrollTop() > 600);
    };

    onScroll();
    target.addEventListener("scroll", onScroll, { passive: true } as AddEventListenerOptions);
    return () => {
      target.removeEventListener("scroll", onScroll as EventListener);
    };
  }, []);

  if (!visible) return null;

  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      className={cn(
        "fixed bottom-6 right-6 z-50 rounded-full shadow-sm glass-card",
        className
      )}
      onClick={() => {
        const container = getScrollContainer();
        if (container) {
          container.scrollTo({ top: 0, left: 0, behavior: "smooth" });
          return;
        }
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      }}
      aria-label="回到顶部"
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  );
}

