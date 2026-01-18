import Link from "next/link";
import { notFound } from "next/navigation";

import { env } from "@/lib/env";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RichContent } from "@/components/content/RichContent";
import { Comments } from "@/components/comments/Comments";

type NewsDetail = {
  id: string;
  title: string;
  content: string;
  create_time: string;
  coverUrl: string | null;
  category: string;
  state: string | boolean;
};

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const apiUrl = new URL(`/api/news/${id}`, env.NEXT_PUBLIC_SITE_URL);

  let item: NewsDetail | null = null;
  try {
    const res = await fetch(apiUrl, { cache: "no-store" });
    const json = await res.json();
    if (!json?.ok) {
      if (res.status === 404) return notFound();
      throw new Error("API_ERROR");
    }
    item = json.data;
  } catch {
    return notFound();
  }

  if (!item) return notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost">
          <Link href="/news">← 返回新闻</Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        {item.coverUrl ? (
          <img src={item.coverUrl} alt="" className="h-60 w-full object-cover" />
        ) : null}
        <CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{item.category}</Badge>
            <span className="text-xs text-muted-foreground">{item.create_time}</span>
          </div>
          <h1 className="text-2xl font-semibold leading-tight">{item.title}</h1>
          <div className="rounded-xl border bg-background/60 p-4">
            <RichContent content={item.content} />
          </div>
        </CardContent>
      </Card>

      <Comments kind="news" targetId={item.id} />
    </div>
  );
}
