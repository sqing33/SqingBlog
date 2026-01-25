import Image from "next/image";
import Link from "next/link";

const animeLinks = [
  {
    href: "/anime/doraemon",
    iconSrc: "/assets/index/icon-doraemon.png",
    alt: "哆啦A梦",
  },
  {
    href: "/anime/bunny-girl",
    iconSrc: "/assets/index/icon-bunny-girl.png",
    alt: "青春猪头少年",
  },
  {
    href: "/anime/koe-no-katachi",
    iconSrc: "/assets/index/icon-koe-no-katachi.png",
    alt: "声之形",
  },
] as const;

export function BlogAnimeQuickLinks() {
  const links = animeLinks.slice(0, 1);
  const isSingle = links.length === 1;
  return (
    <section
      className="panel panel--aside glass-card"
      aria-label="动漫专题快捷入口"
    >
      <div className="side-card__header">
        <h4 className="side-card__title">动漫专题</h4>
      </div>

      <div
        className={
          isSingle
            ? "grid grid-cols-1 place-items-center gap-3"
            : "grid grid-cols-3 gap-3"
        }
      >
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-label={`前往动漫：${item.alt}`}
            title={item.alt}
            className={
              isSingle
                ? "group w-24 overflow-hidden rounded-2xl border border-black/10 bg-white/50 p-2 transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                : "group overflow-hidden rounded-2xl border border-black/10 bg-white/50 p-2 transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
            }
          >
            <div className="relative aspect-square w-full">
              <Image
                src={item.iconSrc}
                alt={item.alt}
                fill
                sizes="(max-width: 768px) 18vw, 96px"
                className="object-contain transition-transform duration-200 group-hover:scale-[1.03]"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
