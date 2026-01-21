"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type AutoFitTitleProps = {
  className?: string;
  children: string;
  maxContainerHeightPx?: number;
  minFontSizePx?: number;
};

function resolveViewportScroller() {
  const candidate = document.querySelector(
    ".el-scrollbar__wrap",
  ) as HTMLElement | null;
  if (!candidate) return null;

  const style = window.getComputedStyle(candidate);
  const overflowY = style.overflowY;
  const overflowScrollable = overflowY === "auto" || overflowY === "scroll";
  if (!overflowScrollable) return null;

  const viewportHeight =
    window.innerHeight ||
    document.documentElement.clientHeight ||
    candidate.clientHeight;
  const isViewportSized = Math.abs(candidate.clientHeight - viewportHeight) <= 4;
  return isViewportSized ? candidate : null;
}

function isAtTop(scrollerEl: HTMLElement | null) {
  if (scrollerEl) return scrollerEl.scrollTop <= 1;
  return (window.scrollY || document.documentElement.scrollTop || 0) <= 1;
}

export function AutoFitTitle({
  className,
  children,
  maxContainerHeightPx = 350,
  minFontSizePx = 18,
}: AutoFitTitleProps) {
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const fit = useCallback(() => {
    const titleEl = titleRef.current;
    if (!titleEl) return;

    const scrollerEl = resolveViewportScroller();
    if (!isAtTop(scrollerEl)) return;

    const containerEl = titleEl.closest(".blog-hero__inner") as HTMLElement | null;
    if (!containerEl) return;

    // Avoid fighting with GSAP during the "navbar" state (inner height ~50px).
    if (containerEl.clientHeight > 0 && containerEl.clientHeight < 120) return;

    if (titleEl.dataset.autofitApplied === "true") {
      titleEl.style.removeProperty("font-size");
      delete titleEl.dataset.autofitApplied;
    }

    // Only fit when we actually overflow the capped container.
    if (containerEl.scrollHeight <= containerEl.clientHeight + 1) return;

    const computed = window.getComputedStyle(titleEl);
    const baseFontSize = Math.floor(parseFloat(computed.fontSize || ""));
    if (!Number.isFinite(baseFontSize) || baseFontSize <= 0) return;

    const lowerBound = Math.max(1, Math.floor(minFontSizePx));
    const upperBound = Math.max(lowerBound, baseFontSize);

    const fits = () => {
      const limit = Math.min(containerEl.clientHeight, maxContainerHeightPx);
      return containerEl.scrollHeight <= limit + 1;
    };

    // If the CSS font-size already fits, keep it (no inline override).
    if (fits()) return;

    let low = lowerBound;
    let high = upperBound;
    let best = lowerBound;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      titleEl.style.fontSize = `${mid}px`;

      if (fits()) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    titleEl.style.fontSize = `${best}px`;
    titleEl.dataset.autofitApplied = "true";
  }, [maxContainerHeightPx, minFontSizePx]);

  const scheduleFit = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      fit();
    });
  }, [fit]);

  useLayoutEffect(() => {
    fit();
    return () => {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [fit, children]);

  useEffect(() => {
    let cancelled = false;
    const fontsReady = (
      document as unknown as { fonts?: { ready?: Promise<unknown> } }
    ).fonts?.ready;

    if (fontsReady) {
      fontsReady
        .catch(() => undefined)
        .then(() => {
          if (cancelled) return;
          scheduleFit();
        });
    }

    const scrollerEl = resolveViewportScroller();

    const onScroll = () => {
      if (!isAtTop(scrollerEl)) return;
      scheduleFit();
    };

    const onResize = () => {
      if (!isAtTop(scrollerEl)) return;
      scheduleFit();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    scrollerEl?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    // One more pass after event listeners are attached.
    if (isAtTop(scrollerEl)) scheduleFit();

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
      scrollerEl?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [scheduleFit]);

  return (
    <h1 ref={titleRef} className={cn(className)}>
      {children}
    </h1>
  );
}
