import Link from "next/link";
import { redirect } from "next/navigation";

import { getUserSession } from "@/lib/auth/server";
import { mysqlQuery } from "@/lib/db/mysql";
import { resolveUploadImageUrl } from "@/lib/uploads";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CollectionRow = {
  blog_id: string;
  title: string;
  coverUrl: string | null;
  collection_time: string;
};

export default async function UserCollectionsPage() {
  const session = await getUserSession();
  if (!session) redirect("/login");

  const rows = await mysqlQuery<CollectionRow>(
    "SELECT b.title, b.coverUrl, ubc.blog_id, ubc.collection_time FROM blog b JOIN user_blog_collection ubc ON b.id = ubc.blog_id WHERE ubc.user_id = ? ORDER BY ubc.collection_time DESC",
    [session.sub]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">我的收藏</h1>
        <Button asChild variant="secondary">
          <Link href="/blog">去逛逛</Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {rows.map((item) => (
          <Card key={item.blog_id} className="overflow-hidden">
            <CardContent className="grid gap-4 p-4 sm:grid-cols-[140px_1fr]">
              <div className="overflow-hidden rounded-lg bg-muted">
                {item.coverUrl ? (
                  <img
                    src={resolveUploadImageUrl(item.coverUrl, "news") || ""}
                    alt=""
                    className="h-24 w-full object-cover sm:h-full"
                  />
                ) : (
                  <div className="flex h-24 items-center justify-center text-xs text-muted-foreground sm:h-full">
                    No Cover
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  收藏于 {item.collection_time}
                </div>
                <h2 className="text-lg font-semibold leading-snug">
                  <Link href={`/blog/${item.blog_id}`} className="hover:underline">
                    {item.title}
                  </Link>
                </h2>
              </div>
            </CardContent>
          </Card>
        ))}

        {!rows.length ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              还没有收藏任何帖子。
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
