import type { ReactNode } from "react";

import { UserAccount } from "@/components/legacy/blog/UserAccount";

export function BlogSidebar({
  showCta = false,
  ctaText = "把灵感放进时光胶囊，分享给更多人。",
  showAccount = true,
  children,
}: {
  showCta?: boolean;
  ctaText?: string;
  showAccount?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="blog-sidebar">
      {showAccount ? (
        <UserAccount showCta={showCta} ctaText={ctaText} className="glass-card" />
      ) : null}
      {children}
    </div>
  );
}
