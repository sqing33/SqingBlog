import { redirect } from "next/navigation";

import { getUserSession } from "@/lib/auth/server";
import { UserSettingsForm } from "@/components/user/UserSettingsForm";

export default async function UserSettingsPage() {
  const session = await getUserSession();
  if (!session) redirect("/login");
  return <UserSettingsForm />;
}
