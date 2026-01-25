"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Disc3, Filter, Search, Sparkles, UserRound } from "lucide-react";

import { BlogSidebar } from "@/components/legacy/blog/BlogSidebar";
import { BlogCard, type BlogCardPost } from "@/components/legacy/blog/BlogCard";
import { BlogCategoryFilter } from "@/components/legacy/blog/BlogCategoryFilter";
import { BlogAnimeQuickLinks } from "@/components/legacy/blog/BlogAnimeQuickLinks";
import { getAccountSummary } from "@/lib/account-summary-client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { HomeMusicPlayer } from "@/components/home/HomeMusicPlayer";

type ApiResponse<T> = { ok?: boolean; data?: T; message?: string };

type BlogApiItem = {
  id: string;
  title: string;
  content?: string;
  coverUrl?: string | null;
  avatarUrl?: string | null;
  create_time: string;
  category?: string | null;
  nickname?: string | null;
  isPinned?: boolean;
  pinnedTime?: string | null;
};

type BlogListResponse = {
  blogArr: BlogApiItem[];
  pinnedArr?: BlogApiItem[];
  total: number;
};

type CategoryOption = { label: string; value: string };

type UserMe = {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
};

type MobilePanel = "anime" | "filter" | "search";

type MusicController = {
  open: boolean;
  setOpen: (open: boolean) => void;
  coverDataUrl: string | null;
};

function stripHtml(html: string) {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMarkdown(md: string) {
  return (md || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*?\]\([^)]+\)/g, " ")
    .replace(/\[[^\]]*?\]\([^)]+\)/g, " ")
    .replace(/^#{1,6}\s+/gm, " ")
    .replace(/^>\s+/gm, " ")
    .replace(/^[-*+]\s+/gm, " ")
    .replace(/^\d+\.\s+/gm, " ")
    .replace(/[*_~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isProbablyHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value || "");
}

function buildExcerpt(content?: string) {
  const raw = content || "";
  const text = isProbablyHtml(raw) ? stripHtml(raw) : stripMarkdown(raw);
  if (!text) return "暂无摘要";
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

function estimateReadingMinutes(content?: string) {
  const raw = content || "";
  const text = isProbablyHtml(raw) ? stripHtml(raw) : stripMarkdown(raw);
  const minutes = Math.round(text.length / 300);
  return Math.max(1, minutes || 1);
}

function getPagerPages(totalPages: number, currentPage: number, maxPages = 7) {
  const pages: number[] = [];
  const half = Math.floor(maxPages / 2);
  let start = Math.max(1, currentPage - half);
  const end = Math.min(totalPages, start + maxPages - 1);
  start = Math.max(1, end - maxPages + 1);
  for (let i = start; i <= end; i += 1) pages.push(i);
  return pages;
}

export function BlogIndex({
  music,
}: {
  music?: MusicController;
} = {}) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [me, setMe] = useState<UserMe | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel | null>(null);
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicCoverDataUrl, setMusicCoverDataUrl] = useState<string | null>(null);

  const effectiveMusicOpen = music?.open ?? musicOpen;
  const setEffectiveMusicOpen = music?.setOpen ?? setMusicOpen;
  const effectiveMusicCoverDataUrl = music?.coverDataUrl ?? musicCoverDataUrl;

  const [categories, setCategories] = useState<CategoryOption[]>([
    { label: "全部", value: "0" },
    { label: "分享", value: "分享" },
    { label: "娱乐", value: "娱乐" },
    { label: "杂谈", value: "杂谈" },
  ]);

  const [keyword, setKeyword] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryValue, setCategoryValue] = useState<string>("0");

  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [posts, setPosts] = useState<BlogCardPost[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<BlogCardPost[]>([]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/blog/categories", { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<CategoryOption[]>;
      const list = Array.isArray(json?.data) ? json.data : [];
      if (!list.length) return;
      setCategories([{ label: "全部", value: "0" }, ...list]);
    } catch {
      // ignore; keep local defaults
    }
  };

  const fetchPosts = async (opts?: { page?: number; keyword?: string; category?: string }) => {
    const nextPage = opts?.page ?? page;
    const nextKeyword = opts?.keyword ?? keyword;
    const nextCategory = opts?.category ?? categoryValue;

    setLoading(true);
    try {
      const url = new URL("/api/blog", window.location.origin);
      url.searchParams.set("page", String(nextPage));
      url.searchParams.set("pageSize", String(pageSize));
      url.searchParams.set("category", nextCategory || "0");
      url.searchParams.set("keyword", nextKeyword || "");

      const res = await fetch(url.toString(), { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<BlogListResponse>;
      if (!res.ok || !json?.ok) throw new Error(json?.message || "API_ERROR");
      const pinnedList = Array.isArray(json?.data?.pinnedArr) ? json.data.pinnedArr : [];
      const list = Array.isArray(json?.data?.blogArr) ? json.data.blogArr : [];

      const mapItem = (raw: BlogApiItem): BlogCardPost => ({
        id: String(raw.id),
        title: raw.title,
        coverUrl: raw.coverUrl,
        avatarUrl: raw.avatarUrl,
        category: raw.category ?? "",
        nickname: raw.nickname ?? "",
        create_time: raw.create_time,
        excerpt: buildExcerpt(raw.content),
        readingMinutes: estimateReadingMinutes(raw.content),
        isPinned: Boolean(raw.isPinned),
      });

      setPinnedPosts(pinnedList.map(mapItem));
      setPosts(list.map(mapItem));
      setTotal(json?.data?.total ?? list.length);
    } catch {
      setPosts([]);
      setPinnedPosts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchPosts({ page: 1, category: "0", keyword: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getAccountSummary().then((summary) => {
      if (cancelled) return;
      setMe(summary.me ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const apply = () => setIsMobile(media.matches);
    apply();

    if (typeof media.addEventListener === "function") media.addEventListener("change", apply);
    else media.addListener(apply);

    return () => {
      if (typeof media.removeEventListener === "function") media.removeEventListener("change", apply);
      else media.removeListener(apply);
    };
  }, []);

  const applySelected = async (nextSelected: string[]) => {
    let nextCategory = "0";
    if (nextSelected.length === 1) nextCategory = nextSelected[0]!;
    else if (nextSelected.length > 1) nextCategory = nextSelected.join(",");

    setSelectedCategories(nextSelected);
    setCategoryValue(nextCategory);
    setPage(1);
    await fetchPosts({ page: 1, category: nextCategory, keyword });
  };

  const onToggleCategory = async (value: string) => {
    const next = selectedCategories.includes(value)
      ? selectedCategories.filter((v) => v !== value)
      : [...selectedCategories, value];
    await applySelected(next);
  };

  const onResetCategories = async () => {
    await applySelected([]);
  };

  const goToPost = (id: string) => router.push(`/blog/${id}`);

  const toggleMobilePanel = (panel: MobilePanel) => {
    setEffectiveMusicOpen(false);
    setMobilePanel((current) => (current === panel ? null : panel));
  };

  const mobilePanelTitle = useMemo(() => {
    if (mobilePanel === "anime") return "动漫专题";
    if (mobilePanel === "filter") return "标签筛选";
    if (mobilePanel === "search") return "搜索";
    return "";
  }, [mobilePanel]);

  return (
    <div className="blog">
      {isMobile ? (
        <>
          <div
            className="blog-mobile-bottom-bar"
            role="navigation"
            aria-label="博客工具栏"
          >
            <button
              type="button"
              className="blog-mobile-bottom-bar__item"
              aria-label={mobilePanel === "anime" ? "关闭动漫专题" : "打开动漫专题"}
              aria-pressed={mobilePanel === "anime"}
              onClick={() => toggleMobilePanel("anime")}
            >
              <span className="blog-mobile-bottom-bar__icon" aria-hidden="true">
                <Sparkles />
              </span>
              <span className="blog-mobile-bottom-bar__text">动漫专题</span>
            </button>

            <button
              type="button"
              className="blog-mobile-bottom-bar__item"
              aria-label={mobilePanel === "filter" ? "关闭标签筛选" : "打开标签筛选"}
              aria-pressed={mobilePanel === "filter"}
              onClick={() => toggleMobilePanel("filter")}
            >
              <span className="blog-mobile-bottom-bar__icon" aria-hidden="true">
                <Filter />
              </span>
              <span className="blog-mobile-bottom-bar__text">标签筛选</span>
            </button>

            <button
              type="button"
              className="blog-mobile-bottom-bar__item"
              aria-label={mobilePanel === "search" ? "关闭搜索" : "打开搜索"}
              aria-pressed={mobilePanel === "search"}
              onClick={() => toggleMobilePanel("search")}
            >
              <span className="blog-mobile-bottom-bar__icon" aria-hidden="true">
                <Search />
              </span>
              <span className="blog-mobile-bottom-bar__text">搜索</span>
            </button>

            <button
              type="button"
              className="blog-mobile-bottom-bar__item"
              aria-label={effectiveMusicOpen ? "关闭音乐" : "打开音乐"}
              aria-pressed={effectiveMusicOpen}
              onClick={() => {
                setMobilePanel(null);
                setEffectiveMusicOpen(!effectiveMusicOpen);
              }}
            >
              {effectiveMusicCoverDataUrl ? (
                <span className="blog-mobile-bottom-bar__avatar" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={effectiveMusicCoverDataUrl} alt="" />
                </span>
              ) : (
                <span className="blog-mobile-bottom-bar__icon" aria-hidden="true">
                  <Disc3 />
                </span>
              )}
              <span className="blog-mobile-bottom-bar__text">音乐</span>
            </button>

            <button
              type="button"
              className="blog-mobile-bottom-bar__item"
              aria-label={me?.nickname ? "打开个人中心" : "登录/注册"}
              onClick={() => router.push(me?.nickname ? "/user" : "/login")}
            >
              <span className="blog-mobile-bottom-bar__avatar" aria-hidden="true">
                {me?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.avatarUrl} alt="" />
                ) : (
                  <UserRound />
                )}
              </span>
              <span className="blog-mobile-bottom-bar__text">
                {me?.nickname ? "我的" : "登录"}
              </span>
            </button>
          </div>

          <Dialog
            open={mobilePanel !== null}
            onOpenChange={(open) => {
              if (!open) setMobilePanel(null);
            }}
          >
            <DialogContent
              className="blog-toc-drawer"
              // Radix/shadcn DialogContent ships with Tailwind `translate-x/y-[-50%]`.
              // In Tailwind v4 this uses the CSS `translate` property (not `transform`),
              // which stacks with our drawer `transform` and pushes the panel off-screen on mobile.
              style={{ translate: "none" }}
            >
              <div className="blog-toc-drawer__header">
                <DialogTitle className="blog-toc-drawer__title">
                  {mobilePanelTitle}
                </DialogTitle>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                {mobilePanel === "filter" ? (
                  <BlogCategoryFilter
                    categories={categories}
                    selected={selectedCategories}
                    onToggle={onToggleCategory}
                    onReset={onResetCategories}
                  />
                ) : null}

                {mobilePanel === "anime" ? <BlogAnimeQuickLinks /> : null}

                {mobilePanel === "search" ? (
                  <section
                    className="panel panel--aside glass-card"
                    aria-label="搜索"
                  >
                    <div className="side-card__header">
                      <h4 className="side-card__title">搜索</h4>
                    </div>
                    <div className="px-4 pb-4">
                      <input
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="搜索标题或内容…"
                        className="search-input h-10 w-full rounded-xl border border-white/60 bg-white/4 px-3 text-sm shadow-sm outline-none focus:border-white/80 backdrop-blur-md"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.04)",
                          backdropFilter: "blur(4px)",
                          WebkitBackdropFilter: "blur(4px)",
                          boxShadow:
                            "0 40px 50px -32px rgba(0, 0, 0, 0.05), inset 0 0 20px rgba(255, 255, 255, 0.25)",
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          setPage(1);
                          fetchPosts({ page: 1, keyword: e.currentTarget.value });
                          setMobilePanel(null);
                        }}
                      />
                    </div>
                  </section>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>

          {!music ? (
            <HomeMusicPlayer
              className="hidden"
              open={musicOpen}
              onOpenChange={setMusicOpen}
              showMobileWidget={false}
              onCoverDataUrlChange={setMusicCoverDataUrl}
            />
          ) : null}
        </>
      ) : null}

      <div className="blog-shell">
        <div className="blog-layout">
	          <div className="main-col">
	            <section className="panel">
	              <div className="panel__header">
                <h3 className="panel__title">最新文章</h3>
                {!isMobile ? (
                  <div className="panel__header-center">
                    <input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="搜索标题或内容…"
                      className="search-input h-10 rounded-xl border border-white/60 bg-white/4 px-3 text-sm shadow-sm outline-none focus:border-white/80 backdrop-blur-md"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                        backdropFilter: "blur(4px)",
                        WebkitBackdropFilter: "blur(4px)",
                        boxShadow:
                          "0 40px 50px -32px rgba(0, 0, 0, 0.05), inset 0 0 20px rgba(255, 255, 255, 0.25)",
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        setPage(1);
                        fetchPosts({ page: 1, keyword: e.currentTarget.value });
                      }}
                    />
                  </div>
                ) : null}

                <div className="panel__header-right">
                  {total ? <span className="panel__count">共 {total} 篇</span> : null}
                  <span className="panel__hint">按发布时间展示</span>
                </div>
	              </div>

	              {loading ? <div className="latest-empty">加载中…</div> : null}
	              {!loading && posts.length === 0 && pinnedPosts.length === 0 ? (
	                <div className="latest-empty">暂无文章，去写一篇吧</div>
	              ) : null}

              {!loading && pinnedPosts.length ? (
                <div className="pinned-list">
                  {pinnedPosts.map((post) => (
                    <BlogCard key={post.id} post={post} onClick={() => goToPost(post.id)} />
                  ))}
                </div>
              ) : null}

              {!loading && posts.length ? (
                <div className="post-grid-container">
                  {posts.map((post) => (
                    <BlogCard key={post.id} post={post} onClick={() => goToPost(post.id)} />
                  ))}
                </div>
              ) : null}

              {total > pageSize ? (
                <div className="pagination">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="user-card__more"
                      disabled={page <= 1}
                      onClick={() => {
                        const next = Math.max(1, page - 1);
                        setPage(next);
                        fetchPosts({ page: next });
                      }}
                    >
                      上一页
                    </button>
                    {getPagerPages(totalPages, page).map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={[
                          "user-card__more",
                          p === page ? "user-card__more--active" : "",
                        ].join(" ")}
                        aria-current={p === page ? "page" : undefined}
                        onClick={() => {
                          setPage(p);
                          fetchPosts({ page: p });
                        }}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="user-card__more"
                      disabled={page >= totalPages}
                      onClick={() => {
                        const next = Math.min(totalPages, page + 1);
                        setPage(next);
                        fetchPosts({ page: next });
                      }}
                    >
                      下一页
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
	          </div>

	          {!isMobile ? (
	            <div className="aside-col">
	              <BlogSidebar>
                  <BlogCategoryFilter
                    categories={categories}
                    selected={selectedCategories}
                    onToggle={onToggleCategory}
                    onReset={onResetCategories}
                  />
                  <BlogAnimeQuickLinks />
                </BlogSidebar>
	            </div>
	          ) : null}
	        </div>
	      </div>
	    </div>
	  );
}
