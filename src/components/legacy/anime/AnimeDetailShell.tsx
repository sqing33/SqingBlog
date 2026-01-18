"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import type { AnimeConfig } from "@/content/animeConfig";
import { cn } from "@/lib/utils";

type AnimeDetailShellProps = {
  anime: AnimeConfig;
  children: React.ReactNode;
};

export function AnimeDetailShell({ anime, children }: AnimeDetailShellProps) {
  const pathname = usePathname();
  const currentTab = useMemo(() => {
    if (pathname.includes("/character")) return "character";
    if (pathname.includes("/website")) return "website";
    return "author";
  }, [pathname]);

  const isDoraemon = anime.id === "doraemon";

  const tabHref = (tab: "author" | "character" | "website") => `/anime/${anime.id}/${tab}`;

  return (
    <div className={cn("anime-detail", `anime-detail--${anime.id}`)}>
      {isDoraemon ? (
        <>
          <nav className="anime-nav anime-nav--floating">
            <div className="anime-nav__container">
              <Link href="/blog" className="anime-nav__back">
                <ArrowLeft className="h-5 w-5" />
                返回博客
              </Link>

              <div className="anime-nav__links">
                <Link
                  href={tabHref("author")}
                  className={cn(
                    "anime-nav__item",
                    currentTab === "author" && "anime-nav__item--active"
                  )}
                >
                  作者介绍
                </Link>
              </div>
            </div>
          </nav>

          <div className="doraemon-fullscreen">{children}</div>
        </>
      ) : (
        <>
          <section className="anime-header">
            <div
              className="anime-header__background"
              style={{ backgroundImage: `url(${anime.banner})` }}
            />
            <div className="anime-header__content">
              <div className="anime-header__info">
                <h1 className="anime-header__title">{anime.name}</h1>
                <p className="anime-header__subtitle">{anime.subtitle}</p>
              </div>
              <div className="anime-header__actions">
                <Link href="/blog" className="anime-header__back">
                  <ArrowLeft className="h-5 w-5" />
                  返回首页
                </Link>
              </div>
            </div>
          </section>

          <nav className="anime-nav">
            <div className="anime-nav__container">
              <Link
                href={tabHref("author")}
                className={cn(
                  "anime-nav__item",
                  currentTab === "author" && "anime-nav__item--active"
                )}
              >
                作者介绍
              </Link>
              <Link
                href={tabHref("character")}
                className={cn(
                  "anime-nav__item",
                  currentTab === "character" && "anime-nav__item--active"
                )}
              >
                动漫人物
              </Link>
              <Link
                href={tabHref("website")}
                className={cn(
                  "anime-nav__item",
                  currentTab === "website" && "anime-nav__item--active"
                )}
              >
                相关网站
              </Link>
            </div>
          </nav>

          <main className="anime-content">{children}</main>
        </>
      )}
    </div>
  );
}
