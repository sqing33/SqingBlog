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
  layoutType?: "hero" | "standard" | "large" | string | null;
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
  const isHero = post.layoutType === "hero" || post.layoutType === "large";
  const coverSrc = post.coverUrl || "/assets/Doraemon/Doraemon.jpg";
  const authorAvatar = post.avatarUrl || "/assets/avatar.png";
  const tagClass = tagClassForCategory(post.category);

  return (
    <article
      className={cn("blog-card", isHero ? "blog-card--hero" : "blog-card--standard")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <div className="card-media">
        <div className="media-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverSrc} alt={post.title} className="card-image" />
          <span className={cn("card-tag", tagClass)}>{post.category || "Blog"}</span>
        </div>
      </div>

      <div className="card-content">
        <h3 className="content-title">{post.title}</h3>
        {isHero ? <p className="content-excerpt">{post.excerpt}</p> : null}

        <div className={cn("content-footer", isHero && "content-footer--hero")}>
          {isHero ? (
            <>
              <div className="author-inline">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="author-avatar" src={authorAvatar} alt="" />
                <span className="author-name">{post.nickname || "Admin"}</span>
              </div>
              <div className="content-meta content-meta--bottom">
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
              </div>
              <span className="author-name">{post.nickname || "Admin"}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

