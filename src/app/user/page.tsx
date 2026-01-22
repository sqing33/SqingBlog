import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Mail,
  MessageSquareText,
  PenLine,
  Phone,
  Settings,
  Star,
  UserCircle2,
} from "lucide-react";

import { getUserSession } from "@/lib/auth/server";
import { mysqlQuery } from "@/lib/db/mysql";
import { rewriteLegacyAssetHosts } from "@/lib/richtext";
import { resolveUploadImageUrl } from "@/lib/uploads";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCenterFeedback } from "@/components/user/UserCenterFeedback";

import "@/styles/glassmorphism.scss";

type UserRow = {
  id: string;
  username: string;
  nickname: string;
  avatarUrl: string | null;
  create_time: string;
  phone: string;
  email: string;
  gender: string | null;
  birthday: string | null;
};

type CountRow = { total: number };

type RecentPostRow = {
  id: string;
  title: string;
  create_time: string;
  coverUrl: string | null;
  category: string;
};

type MyPostRow = RecentPostRow;

type MyCollectionRow = {
  blog_id: string;
  title: string;
  coverUrl: string | null;
  collection_time: string;
  category: string;
};

type FeedbackRow = {
  id: string;
  content: string;
  create_time: string;
};

type UserCenterSection = "recent" | "blogs" | "collections" | "feedback";

function normalizeSearchParam(
  value: string | string[] | undefined
): string {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
}

function parseSection(value: string): UserCenterSection {
  if (value === "blogs") return "blogs";
  if (value === "collections") return "collections";
  if (value === "feedback") return "feedback";
  return "recent";
}

function toDateOnly(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return raw.split(" ")[0] || raw;
}

function formatGender(value: string | null | undefined) {
  const raw = (value || "").trim();
  if (!raw) return "未设置";
  if (raw === "male") return "男";
  if (raw === "female") return "女";
  if (raw === "other") return "其他";
  return raw;
}

export default async function UserCenterPage({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getUserSession();
  if (!session) redirect("/login");

  const sp = searchParams
    ? typeof (searchParams as Promise<unknown>)?.then === "function"
      ? await (searchParams as Promise<Record<string, string | string[] | undefined>>)
      : (searchParams as Record<string, string | string[] | undefined>)
    : {};
  const section = parseSection(normalizeSearchParam(sp.section));

  const rows = await mysqlQuery<UserRow>(
    "SELECT id, username, nickname, avatarUrl, create_time, phone, email, gender, birthday FROM users WHERE id = ? LIMIT 1",
    [session.sub]
  );
  const user = rows[0];
  if (!user) redirect("/login");

  const avatarUrl = resolveUploadImageUrl(user.avatarUrl, "avatars");
  const joinDate = toDateOnly(user.create_time) || user.create_time;
  const birthday = toDateOnly(user.birthday);
  const phone = (user.phone || "").trim() || "未设置";
  const email = (user.email || "").trim() || "未设置";

  const [postCountRow, collectionCountRow, feedbackCountRow] = await Promise.all([
    mysqlQuery<CountRow>("SELECT COUNT(*) AS total FROM user_blog WHERE user_id = ?", [
      session.sub,
    ]),
    mysqlQuery<CountRow>(
      "SELECT COUNT(*) AS total FROM user_blog_collection WHERE user_id = ?",
      [session.sub]
    ),
    mysqlQuery<CountRow>("SELECT COUNT(*) AS total FROM feedback WHERE user_id = ?", [
      session.sub,
    ]),
  ]);

  const postCount = postCountRow?.[0]?.total ?? 0;
  const collectionCount = collectionCountRow?.[0]?.total ?? 0;
  const feedbackCount = feedbackCountRow?.[0]?.total ?? 0;

  const listLimit = 30;
  const feedbackLimit = 20;

  let leftPosts: MyPostRow[] = [];
  let leftCollections: MyCollectionRow[] = [];
  let leftFeedback: FeedbackRow[] = [];

  if (section === "recent" || section === "blogs") {
    const limit = section === "recent" ? 5 : listLimit;
    leftPosts = await mysqlQuery<MyPostRow>(
      `SELECT
        b.id,
        b.title,
        b.create_time,
        b.coverUrl,
        COALESCE(
          GROUP_CONCAT(DISTINCT bcr.category_name ORDER BY bcr.category_name SEPARATOR ','),
          '未分类'
        ) AS category
      FROM blog b
        JOIN user_blog ub ON b.id = ub.blog_id
        LEFT JOIN blog_category_relation bcr ON bcr.blog_id = b.id
      WHERE ub.user_id = ?
      GROUP BY b.id
      ORDER BY b.create_time DESC
      LIMIT ?`,
      [session.sub, limit]
    );
  } else if (section === "collections") {
    leftCollections = await mysqlQuery<MyCollectionRow>(
      `SELECT
        b.title,
        b.coverUrl,
        ubc.blog_id,
        ubc.collection_time,
        COALESCE(
          GROUP_CONCAT(DISTINCT bcr.category_name ORDER BY bcr.category_name SEPARATOR ','),
          '未分类'
        ) AS category
      FROM user_blog_collection ubc
        JOIN blog b ON b.id = ubc.blog_id
        LEFT JOIN blog_category_relation bcr ON bcr.blog_id = b.id
      WHERE ubc.user_id = ?
      GROUP BY ubc.blog_id, ubc.collection_time
      ORDER BY ubc.collection_time DESC
      LIMIT ?`,
      [session.sub, listLimit]
    );
  } else {
    leftFeedback = await mysqlQuery<FeedbackRow>(
      "SELECT id, content, create_time FROM feedback WHERE user_id = ? ORDER BY create_time DESC LIMIT ?",
      [session.sub, feedbackLimit]
    );
  }

  const safeFeedback = leftFeedback.map((item) => ({
    ...item,
    id: String(item.id),
    content: rewriteLegacyAssetHosts(item.content),
  }));

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border bg-white/70 shadow-sm backdrop-blur">
        <div aria-hidden className="absolute inset-0">
          <img
            src="/assets/background.jpg"
            alt=""
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-white/50 to-blue-100/50" />
        </div>

        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl border bg-white/70 shadow-sm">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500/10 to-yellow-400/10">
                  <UserCircle2 className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold leading-tight">{user.nickname}</h1>
                <Badge variant="secondary" className="rounded-full">
                  用户中心
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="truncate">{user.username}</span>
                <span className="hidden text-muted-foreground/60 sm:inline">•</span>
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {email}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                加入于 <span className="font-medium text-foreground/80">{joinDate}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/blog/post">写新帖子</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/blog">回到博客</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/user/settings">账号设置</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/user?section=blogs"
          className="group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="h-full rounded-2xl transition-transform group-hover:-translate-y-0.5 group-hover:shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
                  <PenLine className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium">我的发帖</div>
                  <div className="text-xs text-muted-foreground">共 {postCount} 篇</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>

        <Link
          href="/user?section=collections"
          className="group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="h-full rounded-2xl transition-transform group-hover:-translate-y-0.5 group-hover:shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-700">
                  <Star className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium">我的收藏</div>
                  <div className="text-xs text-muted-foreground">共 {collectionCount} 条</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>

        <Link
          href="/user?section=feedback"
          className="group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="h-full rounded-2xl transition-transform group-hover:-translate-y-0.5 group-hover:shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium">我的反馈</div>
                  <div className="text-xs text-muted-foreground">共 {feedbackCount} 条</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>

        <Link
          href="/user/settings"
          className="group rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card className="h-full rounded-2xl transition-transform group-hover:-translate-y-0.5 group-hover:shadow-md">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-700">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium">账号设置</div>
                  <div className="text-xs text-muted-foreground">头像 · 资料</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,_1fr)_360px]">
        <Card className="w-full min-w-0 rounded-2xl glass-card">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">
                {section === "blogs"
                  ? "我的发帖"
                  : section === "collections"
                    ? "我的收藏"
                    : section === "feedback"
                      ? "我的反馈"
                      : "最近发布"}
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                {section === "blogs"
                  ? `最多展示最近 ${listLimit} 篇`
                  : section === "collections"
                    ? `最多展示最近 ${listLimit} 篇`
                    : section === "feedback"
                      ? "提交建议与查看历史"
                      : "你最近写的 5 篇文章"}
              </div>
            </div>
            {section !== "recent" ? (
              <Button asChild size="sm" variant="ghost">
                <Link href="/user">返回最近发布</Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className={section === "feedback" ? "" : "space-y-3"}>
            {section === "feedback" ? (
              <UserCenterFeedback initialItems={safeFeedback} />
            ) : section === "collections" ? (
              <>
                {leftCollections.map((item) => (
                  <Link
                    key={item.blog_id}
                    href={`/blog/${item.blog_id}`}
                    className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/40"
                  >
                    <div className="h-12 w-16 overflow-hidden rounded-lg border bg-muted">
                      {item.coverUrl ? (
                        <img
                          src={resolveUploadImageUrl(item.coverUrl, "news") || ""}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{item.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="rounded-full">
                          {item.category}
                        </Badge>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          收藏于 {item.collection_time}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}

                {!leftCollections.length ? (
                  <div className="rounded-xl border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    还没有收藏任何帖子。
                    <div className="mt-3">
                      <Button asChild variant="secondary">
                        <Link href="/blog">去逛逛</Link>
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {leftPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.id}`}
                    className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/40"
                  >
                    <div className="h-12 w-16 overflow-hidden rounded-lg border bg-muted">
                      {post.coverUrl ? (
                        <img
                          src={resolveUploadImageUrl(post.coverUrl, "news") || ""}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{post.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="rounded-full">
                          {post.category}
                        </Badge>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {post.create_time}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}

                {!leftPosts.length ? (
                  <div className="rounded-xl border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                    还没有发帖，去写一篇吧。
                    <div className="mt-3">
                      <Button asChild>
                        <Link href="/blog/post">写新帖子</Link>
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="w-full min-w-0 self-start rounded-2xl glass-card lg:!sticky lg:top-6 lg:h-fit">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">我的资料</CardTitle>
            <div className="text-xs text-muted-foreground">账号信息与快捷入口</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">邮箱</span>
                <span className="truncate font-medium">{email}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">手机号</span>
                <span className="truncate font-medium inline-flex items-center gap-1">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {phone}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">性别</span>
                <span className="font-medium">{formatGender(user.gender)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">生日</span>
                <span className="font-medium">{birthday || "未设置"}</span>
              </div>
            </div>

            <div className="h-px w-full bg-border" />

            <div className="grid gap-2">
              <Button asChild variant="secondary" className="justify-between">
                <Link href="/user?section=blogs">
                  我的发帖 <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" className="justify-between">
                <Link href="/user?section=collections">
                  我的收藏 <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" className="justify-between">
                <Link href="/user?section=feedback">
                  我的反馈 <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between">
                <Link href="/user/settings">
                  账号设置 <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
