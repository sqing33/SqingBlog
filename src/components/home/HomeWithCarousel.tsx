"use client";

import { ChevronDown, ChevronLeft, Github } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { HomeMusicPlayer } from "@/components/home/HomeMusicPlayer";
import { MoyuCard } from "@/components/home/MoyuCard";
import { BlogIndex } from "@/components/legacy/blog/BlogIndex";

type GridItem = {
  src: string;
  alt: string;
  iconHref?: string;
  iconSrc?: string;
  iconAlt?: string;
  iconClassName?: string;
  imageClassName?: string;
};

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
  const [duanzi, setDuanzi] = useState<string | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);

  const items = useMemo<GridItem[]>(
    () => [
      {
        src: "/assets/index/doraemon.png",
        alt: "doraemon",
        iconHref: "/anime/doraemon",
        iconSrc: "/assets/index/icon-doraemon.png",
        iconAlt: "doraemon",
        imageClassName: "h-[100%] w-[100%]",
        iconClassName: "",
      },
      {
        src: "/assets/index/bunny-girl.png",
        alt: "bunny girl",
        iconHref: "/anime/bunny-girl",
        iconSrc: "/assets/index/icon-bunny-girl.png",
        iconAlt: "bunny girl",
        imageClassName: "h-[100%] w-[100%]",
        iconClassName: "transform scale-125",
      },
      {
        src: "/assets/index/koe-no-katachi.png",
        alt: "koe no katachi",
        iconHref: "/anime/koe-no-katachi",
        iconSrc: "/assets/index/icon-koe-no-katachi.png",
        iconAlt: "koe no katachi",
        imageClassName: "h-[100%] w-[100%]",
        iconClassName: "",
      },
    ],
    []
  );

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
    const el = document.querySelector(".el-scrollbar__wrap") as
      | HTMLDivElement
      | null;
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
      <div className="fixed right-6 top-6 z-50">
        <HomeMusicPlayer />
      </div>
      <div className="relative h-[100svh] w-full overflow-hidden">
        <div
          ref={panelsRef}
          className="absolute left-0 top-0 h-[200svh] w-full will-change-transform"
          style={{ transform: "translate3d(0, 0, 0)" }}
        >
          <section
            aria-label="首页拼图"
            className="grid h-[100svh] w-full grid-cols-6 grid-rows-3 bg-transparent"
          >
            <div className="col-span-3 col-start-4 row-span-3 row-start-1 flex items-center justify-center p-10">
              <div className="flex flex-col items-center gap-4">
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
                <div className="flex items-center justify-center gap-2 text-center font-semibold tracking-wide text-[#3F3E3E] text-lg sm:text-xl md:text-2xl">
                  <span>三青🎡</span>
                  <a
                    href="https://github.com/sqing33"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="打开 GitHub：sqing33"
                    className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/70 p-2 text-[#3F3E3E]/80 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-[#3F3E3E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                  >
                    <Github className="h-5 w-5" />
                  </a>
                </div>
                <MoyuCard />
              </div>
            </div>

            {items.map((item, idx) => (
              <div key={item.src} className="contents">
                <div
                  className={[
                    "col-span-2 flex items-center justify-center px-6",
                    idx === 0
                      ? "row-start-1"
                      : idx === 1
                      ? "row-start-2"
                      : "row-start-3",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "relative flex items-center justify-center",
                      item.imageClassName ?? "h-[78%] w-[86%]",
                    ].join(" ")}
                  >
                    <Image
                      src={item.src}
                      alt={item.alt}
                      fill
                      priority={idx === 0}
                      sizes="34vw"
                      className="object-contain"
                    />
                  </div>
                </div>

                <div
                  className={[
                    "col-span-1 flex items-center justify-center px-4",
                    idx === 0
                      ? "row-start-1"
                      : idx === 1
                      ? "row-start-2"
                      : "row-start-3",
                  ].join(" ")}
                >
                  {item.iconSrc ? (
                    <Link
                      href={item.iconHref ?? "/anime"}
                      aria-label={`前往：${item.iconAlt ?? item.alt}`}
                      className="group relative flex h-full w-full -left-10 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                    >
                      <div
                        className={[
                          "relative h-full w-full",
                          item.iconClassName ?? "",
                        ].join(" ")}
                      >
                        <Image
                          src={item.iconSrc}
                          alt={item.iconAlt ?? ""}
                          fill
                          sizes="16vw"
                          className="object-contain"
                          priority={idx === 0}
                        />
                      </div>
                      <ChevronLeft className="dora-jump-arrow absolute -right-15 top-1/2 z-10 h-7 w-7 -translate-y-1/2 text-[#3F3E3E]/70 transition-colors group-hover:text-[#3F3E3E]" />
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </section>

          <section aria-label="博客内容" className="h-[100svh] w-full">
            <div
              ref={blogScrollRef}
              className="h-[100svh] w-full overflow-y-auto overflow-x-hidden overscroll-contain"
            >
              <BlogIndex />
            </div>
          </section>
        </div>
      </div>

      {showScrollHint ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
          {duanzi ? (
            <div className="max-w-[min(32rem,90vw)] px-4 text-center font-medium text-[#3F3E3E] text-sm drop-shadow-[0_2px_10px_rgba(0,0,0,0.18)]">
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
