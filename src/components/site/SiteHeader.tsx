import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const animeLinks = [
  { href: "/anime/doraemon", label: "哆啦A梦" },
  { href: "/anime/koe-no-katachi", label: "声之形" },
  { href: "/anime/bunny-girl", label: "青春猪头少年" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/blog" className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">
            Doraemon Blog
          </span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost">
            <Link href="/blog">博客</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/news">新闻</Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost">动漫专题</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {animeLinks.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href}>{item.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button asChild variant="ghost">
            <Link href="/user">用户中心</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/admin">后台</Link>
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/login">登录/注册</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
