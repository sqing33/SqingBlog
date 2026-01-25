import { redirect } from "next/navigation";

import { getUserSession } from "@/lib/auth/server";
import { PostBlogForm } from "@/components/blog/PostBlogForm";

export default async function PostBlogPage() {
  const session = await getUserSession();
  if (!session) redirect("/login");
  return (
    <div className="mx-auto w-full max-w-[1200px] px-0 py-0 md:px-6 md:py-10">
      <PostBlogForm />
    </div>
  );
}
