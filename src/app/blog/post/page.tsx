import { redirect } from "next/navigation";

import { getUserSession } from "@/lib/auth/server";
import { PostBlogForm } from "@/components/blog/PostBlogForm";

export default async function PostBlogPage() {
  const session = await getUserSession();
  if (!session) redirect("/login");
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-10">
      <PostBlogForm />
    </div>
  );
}
