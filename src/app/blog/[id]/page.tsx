import { notFound } from "next/navigation";

import { mysqlQuery } from "@/lib/db/mysql";
import { rewriteLegacyAssetHosts, toSafeHtml } from "@/lib/richtext";
import { resolveUploadImageUrl } from "@/lib/uploads";
import { BlogPage, type BlogDetailViewModel } from "@/components/legacy/blog/BlogPage";

type BlogRow = {
  id: string;
  title: string;
  content: string;
  create_time: string;
  coverUrl: string | null;
  category: string;
  user_id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
};

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) return notFound();

  const rows = await mysqlQuery<BlogRow>(
    "SELECT b.*, users.id AS user_id, users.username, users.nickname, users.avatarUrl FROM blog b JOIN user_blog ON b.id = user_blog.blog_id JOIN users ON user_blog.user_id = users.id WHERE b.id = ? LIMIT 1",
    [id]
  );
  if (!rows.length) return notFound();

  const row = rows[0]!;
  const contentRaw = row.content || "";
  const contentHtml = toSafeHtml(rewriteLegacyAssetHosts(contentRaw));

  const post: BlogDetailViewModel = {
    id: String(row.id),
    title: row.title,
    create_time: row.create_time,
    category: row.category,
    nickname: row.nickname,
    coverUrl: resolveUploadImageUrl(row.coverUrl, "news"),
    avatarUrl: resolveUploadImageUrl(row.avatarUrl, "avatars"),
    contentRaw,
    contentHtml,
  };

  return <BlogPage post={post} />;
}
