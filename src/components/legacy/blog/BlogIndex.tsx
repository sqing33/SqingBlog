"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { BlogSidebar } from "@/components/legacy/blog/BlogSidebar";
import { BlogCard, type BlogCardPost } from "@/components/legacy/blog/BlogCard";
import { BlogCategoryFilter } from "@/components/legacy/blog/BlogCategoryFilter";

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

export function BlogIndex() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

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

  return (
    <div className="blog">
      <div className="blog-shell">
        <div className="blog-layout">
	          <div className="main-col">
	            <section className="panel">
	              <div className="panel__header">
                <h3 className="panel__title">最新文章</h3>
                <div className="panel__header-center">
                  <input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="搜索标题或内容…"
                    className="search-input h-10 rounded-xl border border-white/60 bg-white/4 px-3 text-sm shadow-sm outline-none focus:border-white/80 backdrop-blur-md"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      backdropFilter: 'blur(4px)',
                      WebkitBackdropFilter: 'blur(4px)',
                      boxShadow: '0 40px 50px -32px rgba(0, 0, 0, 0.05), inset 0 0 20px rgba(255, 255, 255, 0.25)'
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      setPage(1);
                      fetchPosts({ page: 1, keyword: e.currentTarget.value });
                    }}
                  />
                </div>

                <div className="panel__header-right">
                  {total ? <span className="panel__count">共 {total} 篇</span> : null}
                  <span className="panel__hint">按发布时间展示</span>
                </div>
	              </div>

                {isMobile ? (
                  <div className="mt-3">
                    <BlogCategoryFilter
                      categories={categories}
                      selected={selectedCategories}
                      onToggle={onToggleCategory}
                      onReset={onResetCategories}
                    />
                  </div>
                ) : null}

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
                        className={["user-card__more", p === page ? "bg-black/5" : ""].join(" ")}
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
                </BlogSidebar>
	            </div>
	          ) : null}
	        </div>
	      </div>
	    </div>
	  );
}
