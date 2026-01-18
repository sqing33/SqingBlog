import { notFound } from "next/navigation";

import { animeConfig } from "@/content/animeConfig";

export default async function AnimeCharacterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const anime = animeConfig[slug];
  if (!anime) return notFound();

  if (slug === "doraemon") return notFound();

  return (
    <div className="anime-character">
      <div className="character-card">
        <div className="character-grid">
          {anime.characters.map((character) => (
            <div key={character.name} className="character-item">
              <div className="character-item__image">
                <img src={character.image} alt={character.name} />
              </div>
              <div className="character-item__info">
                <h3>{character.name}</h3>
                {character.realname ? <p className="realname">{character.realname}</p> : null}
                <div className="character-details">
                  {character.birthday ? <p>生日：{character.birthday}</p> : null}
                  {character.height ? <p>身高：{character.height}</p> : null}
                  {character.weight ? <p>体重：{character.weight}</p> : null}
                </div>
                <p className="character-nature">{character.nature}</p>
                {character.favorite || character.fear ? (
                  <div className="character-tags">
                    {character.favorite ? (
                      <span className="character-tag character-tag--success">喜欢：{character.favorite}</span>
                    ) : null}
                    {character.fear ? (
                      <span className="character-tag character-tag--danger">不喜欢：{character.fear}</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {!anime.characters.length ? <div className="anime-empty">暂无角色信息</div> : null}
        </div>
      </div>
    </div>
  );
}
