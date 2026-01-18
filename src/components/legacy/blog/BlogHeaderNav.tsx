"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { animeList } from "@/content/animeConfig";
import { UserAccount } from "@/components/legacy/blog/UserAccount";

type BlogHeaderNavProps = {
  showCarousel?: boolean;
  collapsed?: boolean;
  syncLayoutProgress?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function BlogHeaderNav(props: BlogHeaderNavProps) {
  const showCarousel = props.showCarousel ?? true;
  const collapsed = props.collapsed ?? false;
  const syncLayoutProgress = props.syncLayoutProgress ?? true;

  const [showMobileAccount, setShowMobileAccount] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const carouselTimerRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  const hasCarousel = showCarousel && !collapsed && animeList.length > 0;

  const getScrollY = () => {
    const scrollbarWrap = document.querySelector(".el-scrollbar__wrap") as HTMLElement | null;
    if (scrollbarWrap) return scrollbarWrap.scrollTop;
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  };

  const applyProgress = (progress: number) => {
    const progressStr = String(progress);
    const host = cardRef.current;
    const container = host?.closest(".blog") as HTMLElement | null;
    container?.style.setProperty("--header-progress", progressStr);
    if (syncLayoutProgress) container?.style.setProperty("--progress", progressStr);

    if (host) {
      const shadowStyle =
        progress > 0.8
          ? "0 1px 2px 0 rgb(0 0 0 / 0.05)"
          : "0 20px 50px -12px rgb(0 0 0 / 0.25)";
      if (host.style.boxShadow !== shadowStyle) host.style.boxShadow = shadowStyle;
    }
  };

  const stopCarousel = () => {
    if (!carouselTimerRef.current) return;
    window.clearInterval(carouselTimerRef.current);
    carouselTimerRef.current = null;
  };

  const startCarousel = () => {
    if (!hasCarousel) return;
    if (carouselTimerRef.current) return;
    carouselTimerRef.current = window.setInterval(() => {
      setCurrentSlideIndex((idx) => (idx + 1) % animeList.length);
    }, 5000);
  };

  const handleScroll = () => {
    const scrollY = getScrollY();
    if (scrollY === lastScrollYRef.current) return;
    lastScrollYRef.current = scrollY;

    if (tickingRef.current) return;
    tickingRef.current = true;

    rafIdRef.current = window.requestAnimationFrame(() => {
      const range = 250;
      const progress = clamp(scrollY / range, 0, 1);
      applyProgress(progress);

      if (progress > 0.1) stopCarousel();
      else startCarousel();

      tickingRef.current = false;
    });
  };

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const apply = () => setShowMobileAccount(media.matches);
    apply();

    if (typeof media.addEventListener === "function") media.addEventListener("change", apply);
    else media.addListener(apply);

    return () => {
      if (typeof media.removeEventListener === "function") media.removeEventListener("change", apply);
      else media.removeListener(apply);
    };
  }, []);

  useEffect(() => {
    if (collapsed) {
      applyProgress(1);
      stopCarousel();
      return;
    }

    const scrollbarWrap = document.querySelector(".el-scrollbar__wrap") as HTMLElement | null;
    if (scrollbarWrap) scrollbarWrap.addEventListener("scroll", handleScroll, { passive: true });
    else window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    applyProgress(0);
    startCarousel();

    return () => {
      if (scrollbarWrap) scrollbarWrap.removeEventListener("scroll", handleScroll);
      else window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);

      stopCarousel();
      if (rafIdRef.current) window.cancelAnimationFrame(rafIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, hasCarousel, syncLayoutProgress]);

  const goToSlide = (index: number) => {
    setCurrentSlideIndex(index);
    stopCarousel();
    startCarousel();
  };

  const safeIndex = useMemo(() => {
    if (!animeList.length) return 0;
    return currentSlideIndex % animeList.length;
  }, [currentSlideIndex]);

  return (
    <section className="blog-header">
      <div ref={cardRef} className="blog-header__card">
        {showMobileAccount ? (
          <div className="blog-header__mobile-account">
            <UserAccount variant="nav" />
          </div>
        ) : null}
        {hasCarousel ? (
          <div className="blog-header__carousel-layer">
            <div className="carousel-wrapper">
              {animeList.map((anime, index) => (
                <div
                  key={anime.id}
                  className={[
                    "carousel-slide",
                    index === safeIndex ? "carousel-slide--active" : "",
                  ].join(" ")}
                >
                  <Link href={`/anime/${anime.id}`} className="carousel-link">
                    <img src={anime.image} alt={anime.name} className="carousel-image" />
                    <div className="carousel-text">
                      <h3 className="carousel-title">{anime.name}</h3>
                      <p className="carousel-subtitle">{anime.subtitle}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>

            <div className="carousel-indicators">
              {animeList.map((_anime, index) => (
                <button
                  key={`indicator-${index}`}
                  type="button"
                  className={[
                    "carousel-indicator",
                    index === safeIndex ? "carousel-indicator--active" : "",
                  ].join(" ")}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="blog-header__bg-layer" />
      </div>
    </section>
  );
}
