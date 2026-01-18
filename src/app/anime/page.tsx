import Link from "next/link";

import { animeList } from "@/content/animeConfig";
import { Card, CardContent } from "@/components/ui/card";

export default function AnimeIndexPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">动漫专题</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {animeList.map((anime) => (
          <Link key={anime.id} href={`/anime/${anime.id}`}>
            <Card className="overflow-hidden transition hover:shadow-md">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-xl border bg-muted">
                    <img
                      src={anime.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-medium">{anime.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {anime.subtitle}
                    </div>
                  </div>
                </div>
                <div
                  className="h-1.5 w-full rounded-full"
                  style={{ background: anime.color }}
                />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
