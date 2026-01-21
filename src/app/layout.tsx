import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "@/styles/legacy/blog.scss";
import "@/styles/legacy/anime.scss";
import { AppShell } from "@/components/layout/AppShell";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const fontSans = Noto_Sans_SC({
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

const fontSerifLatin = Noto_Serif({
  variable: "--font-serif-latin",
  display: "swap",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
});

const fontSerif = Noto_Serif_SC({
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Doraemon Blog",
    template: "%s | Doraemon Blog",
  },
  description: "哆啦A梦世界探索：博客、新闻、角色与互动。",
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
      <body
        className={`${fontSans.variable} ${fontSerifLatin.variable} ${fontSerif.variable} min-h-screen`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
