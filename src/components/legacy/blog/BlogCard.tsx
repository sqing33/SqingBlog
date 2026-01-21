import { cn } from "@/lib/utils";

export type BlogCardPost = {
  id: string;
  title: string;
  excerpt: string;
  coverUrl?: string | null;
  avatarUrl?: string | null;
  category?: string | null;
  create_time?: string | null;
  readingMinutes?: number | null;
  nickname?: string | null;
  isPinned?: boolean | null;
};

function tagClassForCategory(rawCategory?: string | null) {
  const category = (rawCategory ?? "").trim().toLowerCase();

  if (["设计", "design"].includes(category)) return "card-tag--design";
  if (["旅行", "travel"].includes(category)) return "card-tag--travel";
  if (["美食", "food"].includes(category)) return "card-tag--food";
  if (["生活", "lifestyle"].includes(category)) return "card-tag--life";
  if (["科技", "tech", "technology"].includes(category)) return "card-tag--tech";

  if (["分享", "share"].includes(category)) return "card-tag--share";
  if (["娱乐", "fun"].includes(category)) return "card-tag--fun";
  if (["杂谈", "chat"].includes(category)) return "card-tag--talk";

  return "card-tag--default";
}

export function BlogCard({
  post,
  onClick,
}: {
  post: BlogCardPost;
  onClick?: () => void;
}) {
  const isPinned = Boolean(post.isPinned);
  const hasCover = !!post.coverUrl;
  const showMedia = hasCover || isPinned;
  const coverSrc = post.coverUrl || "";
  const authorAvatar = post.avatarUrl || "/assets/avatar.png";
  const categories = post.category
    ? post.category.split(",").map((c) => c.trim()).filter(Boolean)
    : [];

  return (
    <article
      className={cn(
        "blog-card",
        isPinned ? "blog-card--pinned" : "blog-card--standard",
        !hasCover && !isPinned && "blog-card--no-cover"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      {showMedia && (
        <div className="card-media">
          <div className="media-inner">
            {hasCover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverSrc} alt={post.title} className="card-image" />
            ) : (
              <div className="card-image card-image--placeholder" aria-hidden="true" />
            )}
            <div className="card-tags">
              {categories.length > 0 ? (
                categories.map((cat) => (
                  <span key={cat} className={cn("card-tag", tagClassForCategory(cat))}>{cat}</span>
                ))
              ) : (
                <span className={cn("card-tag", tagClassForCategory(null))}>Blog</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card-content">
        <h3 className="content-title">{post.title}</h3>
        {(isPinned || !hasCover) && (
          <p className="content-excerpt">{post.excerpt}</p>
        )}

        <div className={cn("content-footer", isPinned && "content-footer--pinned")}>
          {isPinned ? (
            <>
              <div className="author-inline">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="author-avatar" src={authorAvatar} alt="" />
                <span className="author-name">{post.nickname || "Admin"}</span>
              </div>
              <div className="content-meta content-meta--bottom">
                {!hasCover && categories.length > 0 && (
                  <>
                    {categories.map((cat) => (
                      <span key={cat} className={cn("card-tag", tagClassForCategory(cat))}>{cat}</span>
                    ))}
                    <span className="meta-dot" />
                  </>
                )}
                <span className="meta-date">{post.create_time?.split(" ")[0]}</span>
                <span className="meta-dot" />
                <span className="meta-read">{post.readingMinutes || 1} 分钟阅读</span>
              </div>
            </>
          ) : (
            <>
              <div className="content-meta content-meta--bottom">
                <span className="meta-date">{post.create_time?.split(" ")[0]}</span>
                <span className="meta-dot" />
                <span className="meta-read">{post.readingMinutes || 1} 分钟阅读</span>
                {!hasCover && categories.length > 0 && (
                  <>
                    <span className="meta-dot" />
                    {categories.map((cat) => (
                      <span key={cat} className={cn("card-tag", tagClassForCategory(cat))}>{cat}</span>
                    ))}
                  </>
                )}
              </div>
              <span className="author-name">{post.nickname || "Admin"}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
