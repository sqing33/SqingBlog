"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { ArrowLeft, ChevronDown, MessageCircle, Share2, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { initCodeCollapse } from "@/lib/codeCollapse";
import { Comments } from "@/components/comments/Comments";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

type ApiResponse<T> = { ok?: boolean; data?: T; message?: string };

type UserMe = {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
};

export type BlogDetailViewModel = {
  id: string;
  user_id: string;
  title: string;
  contentRaw: string;
  contentHtml: string;
  create_time: string;
  coverUrl: string | null;
  category: string;
  nickname: string;
  avatarUrl: string | null;
};

type TocItem = { id: string; text: string; level: number };

const MarkdownBody = memo(function MarkdownBody({ html }: { html: string }) {
  const memoHtml = useMemo(() => ({ __html: html }), [html]);
  return (
    <div className="markdown-body bg-transparent text-inherit" dangerouslySetInnerHTML={memoHtml} />
  );
});
MarkdownBody.displayName = "MarkdownBody";

function stripHtml(html: string) {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMarkdown(md: string) {
  let result = md || "";
  result = result.replace(/```[\s\S]*?```/g, (match) =>
    match.replace(/^```\w*\n?/gm, "").replace(/```$/gm, "")
  );
  result = result.replace(/`([^`]+)`/g, "$1");
  result = result.replace(/!\[[^\]]*?\]\([^)]+\)/g, " ");
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  result = result.replace(/^#{1,6}\s+/gm, " ");
  result = result.replace(/^>\s+/gm, " ");
  result = result.replace(/^[-*+]\s+/gm, " ");
  result = result.replace(/^\d+\.\s+/gm, " ");
  result = result.replace(/[*_~]+/g, " ");
  result = result.replace(/\s+/g, " ");
  return result.trim();
}

function isProbablyHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value || "");
}

export function BlogPage({ post }: { post: BlogDetailViewModel }) {
  const router = useRouter();
  const heroRef = useRef<HTMLElement | null>(null);
  const accountRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const commentsRef = useRef<HTMLDivElement | null>(null);

  const [toc, setToc] = useState<TocItem[]>([]);
  const [me, setMe] = useState<UserMe | null>(null);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);

  const readingMinutes = useMemo(() => {
    const raw = post.contentRaw || "";
    const text = isProbablyHtml(raw) ? stripHtml(raw) : stripMarkdown(raw);
    const minutes = Math.round(text.length / 300);
    return Math.max(1, minutes || 1);
  }, [post.contentRaw]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((json: ApiResponse<UserMe | null>) => {
        if (cancelled) return;
        setMe(json?.data ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const headings = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    const items: TocItem[] = [];
    headings.forEach((el, index) => {
      const text = (el.textContent || "").trim();
      if (!text) return;
      const level = Number(el.tagName.slice(1)) || 1;
      const id = el.id || `heading-${index + 1}`;
      el.id = id;
      items.push({ id, text, level });
    });
    setToc(items);

    // Code collapse (match the Vue behavior)
    // Delay a tick to ensure content is fully committed before measuring heights.
    const t = window.setTimeout(() => initCodeCollapse(container), 0);
    return () => window.clearTimeout(t);
  }, [post.id, post.contentHtml]);

  useEffect(() => {
    const setup = () => {
      if (!heroRef.current || !accountRef.current) return;

      const heroEl = heroRef.current;
      const accountEl = accountRef.current;

      const resolveScroller = () => {
        const candidate = document.querySelector(".el-scrollbar__wrap") as HTMLElement | null;
        if (!candidate) return null;

        const style = window.getComputedStyle(candidate);
        const overflowY = style.overflowY;
        const overflowScrollable = overflowY === "auto" || overflowY === "scroll";
        if (!overflowScrollable) return null;

        // Use the wrapper only if it behaves like a viewport-sized scroll container.
        // If it expands with content (auto height), scrolling happens on window/document instead.
        const viewportHeight =
          window.innerHeight || document.documentElement.clientHeight || candidate.clientHeight;
        const isViewportSized = Math.abs(candidate.clientHeight - viewportHeight) <= 4;
        return isViewportSized ? candidate : null;
      };

      const scrollerEl = resolveScroller();

      const existing = ScrollTrigger.getById("blog-page-hero");
      existing?.kill();

      const tl = gsap.timeline({
        scrollTrigger: {
          id: "blog-page-hero",
          ...(scrollerEl ? { scroller: scrollerEl } : {}),
          trigger: "body",
          start: 0,
          end: 300,
          scrub: 1,
        },
      });

      tl.to(
        heroEl,
        {
          x: () => {
            const rect = heroEl.getBoundingClientRect();
            return -rect.left;
          },
          y: -50,
          width: () => window.innerWidth - 182,
          height: 50,
          borderRadius: 0,
          padding: 0,
          borderLeftWidth: 0,
          transformOrigin: "left top",
          duration: 1,
        },
        0
      );

      tl.to(
        heroEl.querySelector(".blog-hero__inner"),
        {
          padding: 0,
          height: 50,
          borderRadius: 0,
          transformOrigin: "left center",
          duration: 1.5,
        },
        0
      );

      tl.to(
        heroEl.querySelector(".blog-hero__label"),
        {
          autoAlpha: 0,
          transformOrigin: "left center",
          duration: 1,
        },
        0
      );

      const titleContainerEl = heroEl.querySelector(".blog-hero_title") as HTMLElement | null;
      const titleEl = heroEl.querySelector(".blog-title") as HTMLElement | null;
      const coverEl = heroEl.querySelector(".blog-cover") as HTMLImageElement | null;

      const heroRect = heroEl.getBoundingClientRect();
      const innerEl = heroEl.querySelector(".blog-hero__inner");
      const innerStyle = innerEl ? window.getComputedStyle(innerEl) : null;
      const innerPaddingLeft = innerStyle ? parseFloat(innerStyle.paddingLeft) || 0 : 0;

      let targetTitleWidth = 0;
      if (titleEl) {
        const originalFontSize = titleEl.style.fontSize;
        const originalWidth = titleEl.style.width;
        const originalWhiteSpace = titleEl.style.whiteSpace;

        titleEl.style.fontSize = "24px";
        titleEl.style.width = "max-content";
        titleEl.style.whiteSpace = "nowrap";
        targetTitleWidth = titleEl.getBoundingClientRect().width;

        titleEl.style.fontSize = originalFontSize;
        titleEl.style.width = originalWidth;
        titleEl.style.whiteSpace = originalWhiteSpace;
      }

      let targetCoverWidth = 0;
      if (coverEl) {
        const naturalWidth = coverEl.naturalWidth || coverEl.width || 280;
        const naturalHeight = coverEl.naturalHeight || coverEl.height || 200;
        const targetHeight = 45;
        targetCoverWidth = (naturalWidth / naturalHeight) * targetHeight;
      }

      const totalTargetWidth = targetTitleWidth + (targetCoverWidth ? targetCoverWidth + 10 : 0);

      if (titleContainerEl) {
        const containerRect = titleContainerEl.getBoundingClientRect();
        const currentLeft = containerRect.left;
        const windowWidth = window.innerWidth;

        const finalX = windowWidth / 2 - totalTargetWidth / 2 - currentLeft + heroRect.left + innerPaddingLeft;

        tl.to(
          titleContainerEl,
          {
            x: finalX,
            y: -20,
            transformOrigin: "left center",
            duration: 1,
          },
          0
        );
      }

      if (titleEl) {
        tl.to(
          titleEl,
          {
            fontSize: 24,
            width: targetTitleWidth,
            duration: 1,
          },
          0
        );
      }

      if (coverEl) {
        tl.to(
          coverEl,
          {
            width: targetCoverWidth,
            height: 45,
            borderRadius: 3,
            marginTop: 2,
            marginLeft: 10,
            duration: 1,
          },
          0
        );
      }

      tl.to(
        heroEl.querySelector(".blog-meta"),
        {
          y: -95,
          marginTop: 0,
          marginLeft: 70,
          transformOrigin: "left center",
          duration: 1,
        },
        0
      );

      // Fade out category + reading time (keep author + time like the Vue version)
      const metaEl = heroEl.querySelector(".blog-meta");
      if (metaEl) {
        const metaItems = metaEl.querySelectorAll(".blog-meta__item");
        const metaDots = metaEl.querySelectorAll(".blog-meta__dot");

        if (metaDots[1]) {
          tl.to(
            metaDots[1],
            {
              autoAlpha: 0,
              duration: 1,
            },
            0
          );
        }

        if (metaItems[2]) {
          tl.to(
            metaItems[2],
            {
              autoAlpha: 0,
              duration: 1,
            },
            0
          );
        }
        if (metaDots[2]) {
          tl.to(
            metaDots[2],
            {
              autoAlpha: 0,
              duration: 1,
            },
            0
          );
        }

        if (metaItems[3]) {
          tl.to(
            metaItems[3],
            {
              autoAlpha: 0,
              duration: 1,
            },
            0
          );
        }
        if (metaDots[3]) {
          tl.to(
            metaDots[3],
            {
              autoAlpha: 0,
              duration: 1,
            },
            0
          );
        }
      }

      tl.to(
        heroEl.querySelector(".blog-hero__back"),
        {
          x: 80,
          y: 70,
          width: 40,
          height: 40,
          borderRadius: 20,
          transformOrigin: "left center",
          duration: 1,
        },
        0
      );

      tl.to(
        heroEl.querySelector(".el-icon"),
        {
          x: 0,
          y: 0,
          transformOrigin: "left center",
          duration: 1,
        },
        0
      );

      // Right account card
      tl.to(
        accountEl,
        {
          x: () => {
            const rect = accountEl.getBoundingClientRect();
            const currentRight = rect.right;
            const windowWidth = window.innerWidth;
            return windowWidth - (currentRight - 150);
          },
          y: -10,
          width: 200,
          borderRadius: 0,
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          padding: 0,
          transformOrigin: "right top",
          duration: 1,
        },
        0
      );

      tl.to(
        accountEl,
        {
          height: 50,
          transformOrigin: "right top",
          duration: 1.5,
        },
        0
      );

      tl.to(
        accountEl.querySelector(".user-card"),
        {
          top: -46,
          transformOrigin: "left center",
          duration: 1,
        },
        0
      );

      tl.to(
        accountEl.querySelector(".user-card__avatar"),
        {
          width: 40,
          height: 40,
          marginLeft: 10,
          marginTop: 5,
          transformOrigin: "left center",
          duration: 1,
        },
        0
      );

      tl.to(
        accountEl.querySelector(".user-card__name"),
        {
          margin: 0,
          transformOrigin: "left center",
          duration: 1,
        },
        0
      );

      tl.to(
        accountEl.querySelector(".side-card__header"),
        {
          autoAlpha: 0,
          transformOrigin: "left center",
          duration: 0.5,
        },
        0
      );

      tl.to(
        accountEl.querySelector(".user-card__desc"),
        {
          autoAlpha: 0,
          height: 0,
          transformOrigin: "left center",
          duration: 0.5,
        },
        0
      );

      return () => {
        tl.kill();
        ScrollTrigger.getById("blog-page-hero")?.kill();
      };
    };

    let cleanup: void | (() => void);
    const timeout = window.setTimeout(() => {
      cleanup = setup();
    }, 500);

    return () => {
      window.clearTimeout(timeout);
      cleanup?.();
    };
  }, [post.id]);

  const scrollToComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const doShare = async () => {
    const title = post.title || "分享链接";
    const url = window.location.href;
    const text = `${title}: ${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setShareHint("已复制链接");
      window.setTimeout(() => setShareHint(null), 1500);
    } catch {
      setShareHint("复制失败");
      window.setTimeout(() => setShareHint(null), 1500);
    }
  };

  const collect = async () => {
    setCollecting(true);
    try {
      const res = await fetch("/api/user/collections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blogId: post.id }),
      });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error("COLLECT_FAILED");
    } catch {
      // ignore
    } finally {
      setCollecting(false);
    }
  };

  const isLogined = Boolean(me?.nickname);
  const userAvatar = me?.avatarUrl || "/assets/avatar.png";
  const userNickname = me?.nickname || "游客";

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setMe(null);
    router.push("/login");
  };

  return (
    <div
      className="blog blog-page"
      style={{ "--progress": 0, "--header-progress": 1, "--header-offset": "0px" } as never}
    >
      <div className="blog-shell">
        <div className="blog-layout">
          <div className="main-col">
            <section ref={heroRef} className="blog-hero">
              <div className="blog-hero__inner">
                <Link className="blog-hero__back" href="/blog" aria-label="返回博客列表">
                  <span className="el-icon">
                    <ArrowLeft />
                  </span>
                </Link>

                <div className="blog-hero__top">
                  <div className="blog-hero__content">
                    <p className="blog-hero__label">Doraemon Blog</p>
                    <div className="blog-hero_title">
                      <h1 className="blog-title">{post.title}</h1>
                      {post.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={post.coverUrl} alt="" className="blog-cover" />
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="blog-meta">
                  <span className="blog-meta__item">{post.nickname || "匿名"}</span>
                  <span className="blog-meta__dot">•</span>
                  <span className="blog-meta__item">{post.create_time}</span>
                  {post.category ? (
                    <>
                      <span className="blog-meta__dot">•</span>
                      <span className="blog-meta__item">{post.category}</span>
                    </>
                  ) : null}
                  <span className="blog-meta__dot">•</span>
                  <span className="blog-meta__item">约 {readingMinutes} 分钟阅读</span>
                </div>
              </div>
            </section>

            <section className="blog-body">
              <article className="blog-article">
                <div className="blog-divider" />
                <div className="blog-content blog-content-container" ref={contentRef}>
                  <MarkdownBody html={post.contentHtml} />
                </div>
              </article>

              <div ref={commentsRef} className="mt-6">
                <Comments kind="blog" targetId={post.id} />
              </div>
            </section>
          </div>

          <div className="aside-col">
            <div className="blog-sidebar">
              <section ref={accountRef} className="side-card side-card--account">
                <div className="side-card__header">
                  <h4 className="side-card__title">账号</h4>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "user-card w-full text-left",
                        "appearance-none bg-transparent p-0",
                        "cursor-pointer"
                      )}
                      aria-label="打开账号菜单"
                    >
                      <div className="user-card__avatar">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={userAvatar} alt="" />
                      </div>
                      <div className="user-card__info">
                        <div className="user-card__name">{userNickname}</div>
                        <div className="user-card__desc">
                          {isLogined ? "欢迎回来，去看看最新帖子吧" : "登录后可发帖、收藏和评论"}
                        </div>
                      </div>
                      <div className="user-card__more" aria-hidden="true">
                        <ChevronDown />
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={10}>
                    {!isLogined ? (
                      <DropdownMenuItem onSelect={() => router.push("/login")}>
                        登录/注册
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem onSelect={() => router.push("/user")}>个人中心</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => router.push("/user/blogs")}>
                          我的发帖
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => router.push("/user/feedback")}>
                          反馈
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}

                    <DropdownMenuItem onSelect={() => router.push("/admin")}>后台管理</DropdownMenuItem>

                    {isLogined ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={logout}>
                          退出登录
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="user-card__quick">
                  {!isLogined ? (
                    <button
                      type="button"
                      className={cn("user-card__primary", "user-card__primary--primary")}
                      onClick={() => router.push("/login")}
                    >
                      登录/注册
                    </button>
                  ) : (
                    <div className="user-card__quick-actions">
                      <button
                        type="button"
                        className={cn("user-card__primary", "user-card__primary--compact")}
                        onClick={() => router.push("/notes")}
                      >
                        便签
                      </button>
                      <button
                        type="button"
                        className={cn("user-card__primary", "user-card__primary--compact")}
                        onClick={() => router.push("/todo")}
                      >
                        代办
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <div className="blog-actions-wrapper">
                <nav className="blog-actions">
                  {me && me.id === post.user_id ? (
                    <button
                      type="button"
                      className="blog-action"
                      onClick={() => router.push(`/blog/${post.id}/edit`)}
                    >
                      <div className="blog-action__circle">
                        <Edit />
                      </div>
                      <span className="blog-action__text">编辑</span>
                    </button>
                  ) : null}

                  <button type="button" className="blog-action" onClick={doShare}>
                    <div className="blog-action__circle">
                      <Share2 />
                    </div>
                    <span className="blog-action__text">{shareHint || "分享"}</span>
                  </button>

                  <button
                    type="button"
                    className="blog-action"
                    onClick={collect}
                    disabled={collecting}
                  >
                    <div className="blog-action__circle">
                      <Star />
                    </div>
                    <span className="blog-action__text">{collecting ? "收藏中" : "收藏"}</span>
                  </button>

                  <button type="button" className="blog-action" onClick={scrollToComments}>
                    <div className="blog-action__circle">
                      <MessageCircle />
                    </div>
                    <span className="blog-action__text">评论</span>
                  </button>
                </nav>
              </div>

              <section className="blog-toc">
                <h4 className="blog-toc__title">文章目录</h4>
                <ul className="toc">
                  {toc.map((item) => (
                    <li
                      key={item.id}
                      className={cn("toc-item", `toc-item--l${item.level}`)}
                      onClick={() => scrollToHeading(item.id)}
                    >
                      {item.text}
                    </li>
                  ))}
                  {!toc.length ? <li className="toc-item toc-item--empty">暂无目录</li> : null}
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
