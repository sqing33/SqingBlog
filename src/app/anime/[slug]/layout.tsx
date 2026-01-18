import { notFound } from "next/navigation";

import { animeConfig } from "@/content/animeConfig";
import { AnimeDetailShell } from "@/components/legacy/anime/AnimeDetailShell";

export default async function AnimeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const anime = animeConfig[slug];
  if (!anime) return notFound();

  return <AnimeDetailShell anime={anime}>{children}</AnimeDetailShell>;
}
