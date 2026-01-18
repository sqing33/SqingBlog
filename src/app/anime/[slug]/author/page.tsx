import { notFound, redirect } from "next/navigation";

import { animeConfig } from "@/content/animeConfig";

export default async function AnimeAuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const anime = animeConfig[slug];
  if (!anime) return notFound();

  if (slug === "doraemon") redirect("/anime/doraemon");

  const author = anime.author;

  return (
    <div className="anime-author">
      <div className="author-card">
        <div className="author-header">
          <div className="author-header__avatar">
            <img src={author.avatar} alt={author.name} />
          </div>
          <div className="author-header__info">
            <h2>{author.name}</h2>
            <p>{author.title}</p>
          </div>
        </div>

        <div className="author-bio">
          <div className="bio-section" dangerouslySetInnerHTML={{ __html: author.bio }} />
        </div>

        {author.links && author.links.length ? (
          <div className="author-links">
            <h3>了解更多</h3>
            <div className="link-list">
              {author.links.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="link-item">
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {author.gallery && author.gallery.length ? (
          <div className="author-gallery">
            <h3>作品展示</h3>
            <div className="gallery-grid">
              {author.gallery.map((img, idx) => (
                <img key={`${img}-${idx}`} src={img} alt="" />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
