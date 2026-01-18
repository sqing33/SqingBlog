import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/auth/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="h-full w-full bg-muted/30">
      <div className="flex h-full w-full flex-col">
        <AdminTopbar username={session.username} />
        <div className="flex min-h-0 flex-1">
          <AdminSidebar />
          <main className="min-w-0 flex-1 overflow-hidden p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
