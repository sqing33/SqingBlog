import { notFound, redirect } from "next/navigation";

import { mysqlQuery } from "@/lib/db/mysql";
import { PostBlogForm } from "@/components/blog/PostBlogForm";
import { requireServerSession } from "@/lib/auth/session";

type BlogRow = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  coverUrl: string | null;
  layoutType: string | null;
};

export default async function BlogEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id) return notFound();

  let payload;
  try {
    payload = await requireServerSession("user");
  } catch {
    redirect("/login");
  }

  const rows = await mysqlQuery<BlogRow>(
    "SELECT b.id, b.title, b.content, b.coverUrl, b.layoutType, ub.user_id FROM blog b JOIN user_blog ub ON b.id = ub.blog_id WHERE b.id = ? LIMIT 1",
    [id]
  );
  if (!rows.length) return notFound();

  const row = rows[0]!;

  if (row.user_id !== payload.sub) {
    redirect(`/blog/${id}`);
  }

  const categoryRelations = await mysqlQuery<{ category_name: string }>(
    "SELECT category_name FROM blog_category_relation WHERE blog_id = ?",
    [id]
  );
  const categories = categoryRelations.map((r) => r.category_name).join(",");

  const initialData = {
    id: String(row.id),
    title: row.title,
    content: row.content,
    category: categories,
    coverUrl: row.coverUrl,
    layoutType: row.layoutType,
  };

  return <PostBlogForm initialData={initialData} />;
}