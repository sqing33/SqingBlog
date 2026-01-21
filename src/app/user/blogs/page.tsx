import Link from "next/link";
import { redirect } from "next/navigation";

import { getUserSession } from "@/lib/auth/server";
import { mysqlQuery } from "@/lib/db/mysql";
import { resolveUploadImageUrl } from "@/lib/uploads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BlogRow = {
  id: string;
  title: string;
  create_time: string;
  coverUrl: string | null;
  category: string;
};

export default async function UserBlogsPage() {
  const session = await getUserSession();
  if (!session) redirect("/login");

  const rows = await mysqlQuery<BlogRow>(
    `SELECT
      b.id,
      b.title,
      b.create_time,
      b.coverUrl,
      COALESCE(
        GROUP_CONCAT(DISTINCT bcr.category_name ORDER BY bcr.category_name SEPARATOR ','),
        '未分类'
      ) AS category
    FROM blog b
      JOIN user_blog ub ON b.id = ub.blog_id
      LEFT JOIN blog_category_relation bcr ON bcr.blog_id = b.id
    WHERE ub.user_id = ?
    GROUP BY b.id
    ORDER BY b.create_time DESC`,
    [session.sub]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">我的发帖</h1>
        <Button asChild>
          <Link href="/blog/post">新建帖子</Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {rows.map((post) => (
          <Card key={post.id} className="overflow-hidden">
            <CardContent className="grid gap-4 p-4 sm:grid-cols-[140px_1fr]">
              <div className="overflow-hidden rounded-lg bg-muted">
                {post.coverUrl ? (
                  <img
                    src={resolveUploadImageUrl(post.coverUrl, "news") || ""}
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
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{post.category}</Badge>
                  <span className="text-xs text-muted-foreground">{post.create_time}</span>
                </div>
                <h2 className="text-lg font-semibold leading-snug">
                  <Link href={`/blog/${post.id}`} className="hover:underline">
                    {post.title}
                  </Link>
                </h2>
              </div>
            </CardContent>
          </Card>
        ))}

        {!rows.length ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              还没有发帖，先去写一篇吧。
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
