import { ReactNode } from "react";

import { BackToTopButton } from "@/components/user/BackToTopButton";

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full min-h-screen pb-10 pt-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute top-28 -left-48 h-[360px] w-[360px] rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="absolute top-72 -right-48 h-[420px] w-[420px] rounded-full bg-rose-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl space-y-6 px-4">
        {children}
      </div>

      <BackToTopButton />
    </div>
  );
}
