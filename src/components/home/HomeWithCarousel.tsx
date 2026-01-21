"use client";

import { ChevronDown, ChevronLeft, Github } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { HomeMusicPlayer } from "@/components/home/HomeMusicPlayer";
import { MoyuCard } from "@/components/home/MoyuCard";
import { BlogIndex } from "@/components/legacy/blog/BlogIndex";

type GridItem = {
  src: string;
  alt: string;
  iconSrc?: string;
  iconAlt?: string;
  iconClassName?: string;
  imageClassName?: string;
};

export function HomeWithCarousel() {
  const scrollElRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const blogRef = useRef<HTMLElement | null>(null);
  const lockRef = useRef(false);
  const wheelAccumRef = useRef(0);
  const [duanzi, setDuanzi] = useState<string | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);

  const iconHref = "/anime/doraemon";

  const items = useMemo<GridItem[]>(
    () => [
      {
        src: "/assets/index/doraemon.png",
        alt: "doraemon",
        iconSrc: "/assets/index/icon-doraemon.png",
        iconAlt: "doraemon",
        imageClassName: "h-[100%] w-[100%]",
        iconClassName: "",
      },
      {
        src: "/assets/index/bunny-girl.png",
        alt: "bunny girl",
        iconSrc: "/assets/index/icon-bunny-girl.png",
        iconAlt: "bunny girl",
        imageClassName: "h-[100%] w-[100%]",
        iconClassName: "transform scale-125",
      },
      {
        src: "/assets/index/koe-no-katachi.png",
        alt: "koe no katachi",
        iconSrc: "/assets/index/icon-koe-no-katachi.png",
        iconAlt: "koe no katachi",
        imageClassName: "h-[100%] w-[100%]",
        iconClassName: "",
      },
    ],
    []
  );

  useEffect(() => {
    const el = document.querySelector(
      ".el-scrollbar__wrap"
    ) as HTMLDivElement | null;
    if (!el) return;
    scrollElRef.current = el;

    el.classList.add("home-snap-scroll");
    return () => {
      el.classList.remove("home-snap-scroll");
    };
  }, []);

  useEffect(() => {
    const scrollEl = scrollElRef.current;
    if (!scrollEl) return;

    const onScroll = () => {
      setShowScrollHint(scrollEl.scrollTop < 48);
    };

    onScroll();
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const scrollEl = scrollElRef.current;
    if (!scrollEl) return;

    const heroEl = heroRef.current;
    const blogEl = blogRef.current;
    if (!heroEl || !blogEl) return;

    const scrollToY = (top: number) => {
      lockRef.current = true;
      scrollEl.scrollTo({ top, behavior: "smooth" });
      window.setTimeout(() => {
        lockRef.current = false;
      }, 650);
    };

    const getTargets = () => {
      const heroTop = heroEl.offsetTop;
      const blogTop = blogEl.offsetTop;
      return { heroTop, blogTop };
    };

    const onWheel = (e: WheelEvent) => {
      if (lockRef.current) {
        e.preventDefault();
        return;
      }

      const { heroTop, blogTop } = getTargets();
      const y = scrollEl.scrollTop;
      const threshold = 16;

      const inHero = y < blogTop - threshold;
      const atBlogTop = y >= blogTop - threshold && y <= blogTop + threshold;

      if (inHero) {
        e.preventDefault();
        wheelAccumRef.current += e.deltaY;
        if (wheelAccumRef.current < 60) return;
        wheelAccumRef.current = 0;
        scrollToY(blogTop);
        return;
      }

      if (atBlogTop && e.deltaY < 0) {
        e.preventDefault();
        wheelAccumRef.current += e.deltaY;
        if (wheelAccumRef.current > -60) return;
        wheelAccumRef.current = 0;
        scrollToY(heroTop);
      }
    };

    scrollEl.addEventListener("wheel", onWheel, { passive: false });
    return () =>
      scrollEl.removeEventListener("wheel", onWheel as EventListener);
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
    <div className="relative">
      <div className="fixed right-6 top-6 z-50">
        <HomeMusicPlayer />
      </div>
      <section
        ref={heroRef}
        aria-label="首页拼图"
        className="home-snap-section grid h-[100svh] w-full grid-cols-6 grid-rows-3 bg-transparent"
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
                  href={iconHref}
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

      <section
        ref={blogRef}
        aria-label="博客内容"
        className="home-snap-section min-h-[100svh]"
      >
        <BlogIndex />
      </section>

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
