"use client";

import { ChevronDown, Github } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { HomeMusicPlayer } from "@/components/home/HomeMusicPlayer";
import { HomeRightPanel } from "@/components/home/HomeRightPanel";
import { MoyuCard } from "@/components/home/MoyuCard";
import { BlogIndex } from "@/components/legacy/blog/BlogIndex";

function CsdnIconPlaceholder({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1024 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
    >
      <path
        d="M512 0c282.784 0 512 229.216 512 512s-229.216 512-512 512S0 794.784 0 512 229.216 0 512 0z m189.952 752l11.2-108.224c-31.904 9.536-100.928 16.128-147.712 16.128-134.464 0-205.728-47.296-195.328-146.304 11.584-110.688 113.152-145.696 232.64-145.696 54.784 0 122.432 8.8 151.296 18.336L768 272.704C724.544 262.24 678.272 256 599.584 256c-203.2 0-388.704 94.88-406.4 263.488C178.336 660.96 303.584 768 535.616 768c80.672 0 138.464-6.432 166.336-16z"
        fill="#CE000D"
        data-p-id="2630"
      ></path>
      {/* TODO: replace with real CSDN svg */}
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="4"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M7 12h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HomeWithCarousel() {
  const searchParams = useSearchParams();
  const shellScrollRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef(0);
  const panelsRef = useRef<HTMLDivElement | null>(null);
  const blogScrollRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lockRef = useRef(false);
  const wheelAccumRef = useRef(0);
  const currentYRef = useRef(0);
  const targetYRef = useRef(0);
  const [panel, setPanel] = useState<"hero" | "blog">("hero");
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicCoverDataUrl, setMusicCoverDataUrl] = useState<string | null>(null);
  const [duanzi, setDuanzi] = useState<string | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);

  useEffect(() => {
    const targetPanel = searchParams.get("panel");
    if (targetPanel !== "blog") return;
    const t = window.setTimeout(() => {
      setPanel("blog");
      setShowScrollHint(false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [searchParams]);

  useEffect(() => {
    const el = document.querySelector(
      ".el-scrollbar__wrap",
    ) as HTMLDivElement | null;
    if (!el) return;
    shellScrollRef.current = el;

    el.classList.add("home-shell-lock");
    return () => {
      el.classList.remove("home-shell-lock");
    };
  }, []);

  useEffect(() => {
    const updateViewport = () => {
      viewportRef.current = window.innerHeight;
      const vh = viewportRef.current;
      if (panel === "blog") {
        currentYRef.current = vh;
        targetYRef.current = vh;
        if (panelsRef.current) {
          panelsRef.current.style.transform = `translate3d(0, ${-vh}px, 0)`;
        }
      }
    };

    updateViewport();
    window.addEventListener("resize", updateViewport, { passive: true });
    return () => window.removeEventListener("resize", updateViewport);
  }, [panel]);

  useEffect(() => {
    const el = shellScrollRef.current;
    if (!el) return;

    const animate = () => {
      rafRef.current = null;
      const panelsEl = panelsRef.current;
      if (!panelsEl) return;

      const vh = viewportRef.current || window.innerHeight;
      const current = currentYRef.current;
      const target = targetYRef.current;
      const next = current + (target - current) * 0.18;

      currentYRef.current = next;
      panelsEl.style.transform = `translate3d(0, ${-next}px, 0)`;
      setShowScrollHint(panel === "hero" && next < 48);

      const remaining = Math.abs(target - next);
      if (remaining > 0.5) {
        rafRef.current = window.requestAnimationFrame(animate);
        return;
      }

      currentYRef.current = target;
      panelsEl.style.transform = `translate3d(0, ${-target}px, 0)`;

      if (panel === "hero" && target >= vh - 1) {
        const blogEl = blogScrollRef.current;
        if (blogEl) blogEl.scrollTop = 0;
        setPanel("blog");
        setShowScrollHint(false);
      }

      lockRef.current = false;
    };

    const schedule = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(animate);
    };

    const startTransitionToBlog = () => {
      if (panel !== "hero") return;
      if (lockRef.current) return;
      lockRef.current = true;
      wheelAccumRef.current = 0;
      const vh = viewportRef.current || window.innerHeight;
      targetYRef.current = vh;
      schedule();
    };

    const onWheel = (e: WheelEvent) => {
      if (panel !== "hero") return;
      e.preventDefault();

      if (lockRef.current) return;
      wheelAccumRef.current += e.deltaY;
      if (wheelAccumRef.current < 120) return;
      startTransitionToBlog();
    };

    const onTouchStart = (e: TouchEvent) => {
      if (panel !== "hero") return;
      const touch = e.touches.item(0);
      if (!touch) return;
      (onTouchStart as unknown as { lastY?: number }).lastY = touch.clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (panel !== "hero") return;
      if (lockRef.current) {
        e.preventDefault();
        return;
      }
      const touch = e.touches.item(0);
      if (!touch) return;
      const store = onTouchStart as unknown as { lastY?: number };
      const lastY = store.lastY ?? touch.clientY;
      const deltaY = lastY - touch.clientY;
      store.lastY = touch.clientY;

      e.preventDefault();
      wheelAccumRef.current += deltaY;
      if (wheelAccumRef.current < 80) return;
      startTransitionToBlog();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel as EventListener);
      el.removeEventListener("touchstart", onTouchStart as EventListener);
      el.removeEventListener("touchmove", onTouchMove as EventListener);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [panel]);

  useEffect(() => {
    const el = blogScrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY >= 0) return;
      if (el.scrollTop > 0) return;
      e.preventDefault();
      el.scrollTop = 0;
    };

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches.item(0);
      if (!touch) return;
      (onTouchStart as unknown as { lastY?: number }).lastY = touch.clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches.item(0);
      if (!touch) return;
      const store = onTouchStart as unknown as { lastY?: number };
      const lastY = store.lastY ?? touch.clientY;
      const deltaY = touch.clientY - lastY;
      store.lastY = touch.clientY;

      if (deltaY <= 0) return;
      if (el.scrollTop > 0) return;
      e.preventDefault();
      el.scrollTop = 0;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel as EventListener);
      el.removeEventListener("touchstart", onTouchStart as EventListener);
      el.removeEventListener("touchmove", onTouchMove as EventListener);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch("/api/60s/duanzi", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          ok?: boolean;
          data?: { duanzi?: string };
        };
        const value = json?.data?.duanzi;
        if (value) setDuanzi(value);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  return (
    <div className="relative h-[100svh] w-full overflow-hidden">
      <div className="fixed right-6 top-6 z-50 pointer-events-none md:pointer-events-auto">
        <div className="pointer-events-auto">
          <HomeMusicPlayer
            open={musicOpen}
            onOpenChange={setMusicOpen}
            showMobileWidget={panel === "hero"}
            autoExpandMobileWidget={panel === "hero"}
            onCoverDataUrlChange={setMusicCoverDataUrl}
          />
        </div>
      </div>
      <div className="relative h-[100svh] w-full overflow-hidden">
        <div
          ref={panelsRef}
          className="absolute left-0 top-0 h-[200svh] w-full will-change-transform"
          style={{ transform: "translate3d(0, 0, 0)" }}
        >
          <section
            aria-label="首页拼图"
            className="flex h-[100svh] w-full items-center bg-transparent"
          >
            <div className="flex h-full w-full flex-col items-center justify-center gap-8 px-6 sm:px-10 md:grid md:grid-cols-3 md:items-center md:justify-items-stretch md:gap-4 md:px-10 lg:px-24 xl:px-48 2xl:px-64">
              <div className="flex flex-col items-center gap-4 md:col-start-2 md:row-start-1">
                <div className="relative h-40 w-40 overflow-hidden rounded-full ring-2 ring-white/20 sm:h-48 sm:w-48 md:h-56 md:w-56">
                  <Image
                    src="/assets/avatar.jpg"
                    alt="avatar"
                    fill
                    sizes="(min-width: 768px) 24vw, (min-width: 640px) 28vw, 36vw"
                    className="object-cover"
                    priority
                  />
                </div>

                <div className="flex flex-col items-center gap-3 text-center sm:w-48 md:w-56 w-full px-4">
                  <div className="text-[#3F3E3E] text-lg font-semibold tracking-wide sm:text-xl md:text-2xl">
                    三青🎡
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <a
                      href="https://github.com/sqing33"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="打开 GitHub：sqing33"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-2 text-sm font-semibold text-[#3F3E3E]/80 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-[#3F3E3E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                    >
                      <Github className="h-4 w-4" />
                      <span>sqing33</span>
                    </a>
                    <a
                      href="https://blog.csdn.net/qq_31800065"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="打开 CSDN：qq_31800065"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-2 text-sm font-semibold text-[#3F3E3E]/80 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-[#3F3E3E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                    >
                      <CsdnIconPlaceholder className="h-4 w-4 text-[#3F3E3E]/80" />
                      <span>三青33</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="hidden md:flex w-full justify-center md:col-start-1 md:row-start-1 md:justify-center">
                <MoyuCard />
              </div>

              <div className="flex md:col-start-3 md:row-start-1 md:h-full md:items-center md:justify-center">
                <HomeRightPanel />
              </div>
            </div>
          </section>

          <section aria-label="博客内容" className="h-[100svh] w-full">
            <div
              ref={blogScrollRef}
              className="h-[100svh] w-full overflow-y-auto overflow-x-hidden overscroll-contain"
            >
              <BlogIndex
                music={{
                  open: musicOpen,
                  setOpen: setMusicOpen,
                  coverDataUrl: musicCoverDataUrl,
                }}
              />
            </div>
          </section>
        </div>
      </div>

{showScrollHint ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
          {duanzi ? (
            <div className="w-[calc(100vw-20px)] px-[10px] text-center font-medium text-[#3F3E3E] text-sm drop-shadow-[0_2px_10px_rgba(0,0,0,0.18)] md:max-w-[min(32rem,90vw)] md:px-4">
              {duanzi}
            </div>
          ) : null}
          <div className="home-scroll-hint-bob flex items-center justify-center">
            <ChevronDown className="h-9 w-9 text-[#3F3E3E]/75 drop-shadow-[0_2px_10px_rgba(0,0,0,0.18)]" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
