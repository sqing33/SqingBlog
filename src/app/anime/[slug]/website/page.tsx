import { notFound } from "next/navigation";

import { animeConfig } from "@/content/animeConfig";

export default async function AnimeWebsitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const anime = animeConfig[slug];
  if (!anime) return notFound();

  if (slug === "doraemon") return notFound();

  const officialSites = anime.websites?.official || [];
  const videoSites = anime.websites?.video || [];

  return (
    <div className="anime-website">
      {officialSites.length ? (
        <div className="website-section">
          <h2 className="section-title">官方网站</h2>
          <div className="website-grid">
            {officialSites.map((site) => (
              <a key={site.url} href={site.url} target="_blank" rel="noreferrer" className="website-card">
                <img src={site.image} alt={site.name} />
                <div className="website-card__content">
                  <h3>{site.name}</h3>
                  {site.description ? <p>{site.description}</p> : null}
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {videoSites.length ? (
        <div className="video-section">
          <h2 className="section-title">视频资源</h2>
          <div className="video-list">
            {videoSites.map((video) => (
              <a key={video.url} href={video.url} target="_blank" rel="noreferrer" className="video-card">
                <img src={video.image} alt={video.name} />
                <span>{video.name}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {!officialSites.length && !videoSites.length ? <div className="anime-empty">暂无网站信息</div> : null}
    </div>
  );
}
