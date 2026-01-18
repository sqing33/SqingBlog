"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ListTodo, StickyNote } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserMe = {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
};

type ApiResponse<T> = { ok?: boolean; data?: T; message?: string };

export function UserAccount({
  showCta = true,
  ctaText = "把灵感放进时光胶囊，分享给更多人。",
  variant = "panel",
}: {
  showCta?: boolean;
  ctaText?: string;
  variant?: "panel" | "nav";
}) {
  const router = useRouter();
  const [me, setMe] = useState<UserMe | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((json: ApiResponse<UserMe | null>) => {
        if (cancelled) return;
        setMe(json?.data ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isLogined = useMemo(() => Boolean(me?.nickname), [me]);
  const userAvatar = me?.avatarUrl || "/assets/avatar.png";
  const userNickname = me?.nickname || "游客";

  const goLogin = () => router.push("/login");
  const goToUserInfo = () => router.push("/user");
  const goToMyBlogs = () => router.push("/user/blogs");
  const goToFeedback = () => router.push("/user/feedback");
  const goToNotes = () => router.push("/notes");
  const goToTodo = () => router.push("/todo");
  const goToAdmin = () => router.push("/admin");
  const writeBlog = () => router.push("/blog/post");

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setMe(null);
    router.push("/login");
  };

  const menuContent = (
    <>
      {!isLogined ? (
        <DropdownMenuItem onSelect={goLogin}>登录/注册</DropdownMenuItem>
      ) : (
        <>
          <DropdownMenuItem onSelect={goToUserInfo}>个人中心</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={goToMyBlogs}>我的发帖</DropdownMenuItem>
          <DropdownMenuItem onSelect={goToFeedback}>反馈</DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}

      <DropdownMenuItem onSelect={goToAdmin}>后台管理</DropdownMenuItem>

      {isLogined ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={logout}>
            退出登录
          </DropdownMenuItem>
        </>
      ) : null}
    </>
  );

  if (variant === "nav") {
    return (
      <div className="user-account-nav" role="navigation" aria-label="账号导航栏">
        <div className="user-account-nav__inner">
          <div className="user-account-nav__brand">博客</div>

          <div className="user-account-nav__actions">
            {isLogined ? (
              <>
                <button
                  type="button"
                  className="user-account-nav__icon"
                  onClick={goToNotes}
                  aria-label="便签"
                >
                  <StickyNote aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="user-account-nav__icon"
                  onClick={goToTodo}
                  aria-label="代办"
                >
                  <ListTodo aria-hidden="true" />
                </button>
              </>
            ) : null}
            <button
              type="button"
              className={cn(
                "user-account-nav__primary",
                isLogined ? "user-account-nav__primary--accent" : "user-account-nav__primary--muted"
              )}
              onClick={isLogined ? writeBlog : goLogin}
            >
              {isLogined ? "写帖子" : "登录/注册"}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="user-account-nav__trigger"
                  aria-label="打开账号菜单"
                >
                  <span className="user-account-nav__avatar" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={userAvatar} alt="" />
                  </span>
                  <span className="user-account-nav__name">{userNickname}</span>
                  <span className="user-account-nav__chevron" aria-hidden="true">
                    <ChevronDown />
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={10}>
                {menuContent}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="panel panel--aside user-account-panel">
      <div className="side-card__header">
        <h4 className="side-card__title">账号</h4>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "user-card w-full text-left",
              "appearance-none bg-transparent p-0",
              "cursor-pointer"
            )}
            aria-label="打开账号菜单"
          >
            <div className="user-card__avatar">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={userAvatar} alt="" />
            </div>
            <div className="user-card__info">
              <div className="user-card__name">{userNickname}</div>
              <div className="user-card__desc">
                {isLogined ? "欢迎回来，去看看最新帖子吧" : "登录后可发帖、收藏和评论"}
              </div>
            </div>
            <div className="user-card__more" aria-hidden="true">
              <ChevronDown />
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={10}>
          {menuContent}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="user-card__quick">
        {!isLogined ? (
          <button
            type="button"
            className={cn("user-card__primary", "user-card__primary--primary")}
            onClick={goLogin}
          >
            登录/注册
          </button>
        ) : (
          <div className="user-card__quick-actions">
            <button
              type="button"
              className={cn("user-card__primary", "user-card__primary--compact")}
              onClick={writeBlog}
            >
              发帖
            </button>
            <button
              type="button"
              className={cn("user-card__primary", "user-card__primary--compact")}
              onClick={goToNotes}
            >
              便签
            </button>
            <button
              type="button"
              className={cn("user-card__primary", "user-card__primary--compact")}
              onClick={goToTodo}
            >
              代办
            </button>
          </div>
        )}
      </div>

      {showCta ? (
        <div className="cta-section">
          <p className="cta__desc">{ctaText}</p>
          {isLogined ? (
            <button type="button" className="cta__button" onClick={writeBlog}>
              发表帖子
            </button>
          ) : (
            <button type="button" className="cta__button" onClick={goLogin}>
              登录后发表
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
