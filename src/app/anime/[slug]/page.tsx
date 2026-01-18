import { redirect } from "next/navigation";

export default async function AnimeSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/anime/${slug}/author`);
}

