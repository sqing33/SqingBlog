import { redirect } from "next/navigation";

import { getUserSession } from "@/lib/auth/server";
import { FeedbackPanel } from "@/components/user/FeedbackPanel";

export default async function UserFeedbackPage() {
  const session = await getUserSession();
  if (!session) redirect("/login");
  return <FeedbackPanel />;
}
