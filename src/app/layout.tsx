import type { Metadata } from "next";
import "./globals.css";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "@/styles/legacy/blog.scss";
import "@/styles/legacy/anime.scss";
import { AppShell } from "@/components/layout/AppShell";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: {
    default: "SQBlog",
    template: "%s | SQBlog",
  },
  description: "三青的世界探索：博客、新闻、角色与互动。",
  metadataBase: new URL(siteUrl),
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
