"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Reply as ReplyIcon, ThumbsUp } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toClientSafeHtml } from "@/lib/richtext-client";
import { MarkdownEditor } from "@/components/markdown/MarkdownEditor";

type CommentNode = {
  id: string;
  content: string;
  create_time: string;
  publisher_id: string;
  nickname: string;
  avatarUrl: string | null;
  pid: string | null;
  pname: string | null;
  like: number;
  children?: CommentNode[];
};

function getAvatarFallback(nickname: string | null | undefined) {
  const value = (nickname || "").trim();
  return value ? value.slice(0, 1).toUpperCase() : "？";
}

function CommentContent({ content }: { content: string }) {
  const html = useMemo(() => toClientSafeHtml(content), [content]);
  return (
    <div
      className="markdown-body bg-transparent text-inherit"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function ReplyItem({
  node,
  rootFloor,
  replyFloor,
  replyTargetFloor,
  onLike,
  onReply,
}: {
  node: CommentNode;
  rootFloor: number;
  replyFloor: number;
  replyTargetFloor: string | null;
  onLike: (id: string) => void;
  onReply: (pid: string, pname: string) => void;
}) {
  const avatarSrc = node.avatarUrl || "/assets/avatar.png";
  const floorLabel = `${rootFloor}-${replyFloor}楼`;

  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <div className="flex items-start gap-3">
        <Avatar className="mt-0.5 size-7">
          <AvatarImage src={avatarSrc} alt={node.nickname || "avatar"} />
          <AvatarFallback>{getAvatarFallback(node.nickname)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              <span className="font-medium">{node.nickname || "匿名"}</span>
              {node.pname ? (
                <span className="text-muted-foreground">
                  {" "}
                  回复 <span className="font-medium">{node.pname}</span>
                  {replyTargetFloor ? <span className="ml-1">（{replyTargetFloor}）</span> : null}
                </span>
              ) : null}
            </div>
            <Badge variant="secondary">{floorLabel}</Badge>
          </div>

          <div className="mt-1 text-xs text-muted-foreground">{node.create_time}</div>

          <div className="mt-2">
            <CommentContent content={node.content} />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => onLike(node.id)}>
              <ThumbsUp className="mr-1 size-4" />
              点赞 {node.like ? `(${node.like})` : ""}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onReply(node.id, node.nickname)}>
              <ReplyIcon className="mr-1 size-4" />
              回复
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RootComment({
  node,
  floor,
  onLike,
  onReply,
}: {
  node: CommentNode;
  floor: number;
  onLike: (id: string) => void;
  onReply: (pid: string, pname: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const [page, setPage] = useState(1);

  const avatarSrc = node.avatarUrl || "/assets/avatar.png";
  const children = useMemo(() => {
    const list = (node.children || []).slice();
    list.sort((a, b) => String(a.create_time).localeCompare(String(b.create_time)));
    return list;
  }, [node.children]);

  const hasChildren = children.length > 0;
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(children.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const replyIndexById = useMemo(() => {
    const map = new Map<string, number>();
    children.forEach((c, idx) => map.set(String(c.id), idx + 1));
    return map;
  }, [children]);

  const getReplyTargetFloor = (pid: string | null) => {
    if (!pid) return null;
    const pidStr = String(pid);
    if (pidStr === String(node.id)) return `${floor}楼`;
    const idx = replyIndexById.get(pidStr);
    return idx ? `${floor}-${idx}楼` : null;
  };

  const pagedReplies = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return children.slice(start, end);
  }, [children, safePage]);

  return (
    <div className="rounded-xl border bg-background/70">
      <div className="p-3">
        <div className="flex items-start gap-3">
          <Avatar className="mt-0.5 size-8">
            <AvatarImage src={avatarSrc} alt={node.nickname || "avatar"} />
            <AvatarFallback>{getAvatarFallback(node.nickname)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                <span className="font-medium">{node.nickname || "匿名"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{floor}楼</Badge>
                <span className="text-xs text-muted-foreground">{node.create_time}</span>
              </div>
            </div>

            <div className="mt-2">
              <CommentContent content={node.content} />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {hasChildren ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (collapsed) setPage(1);
                    setCollapsed((v) => !v);
                  }}
                >
                  {collapsed ? `展开 ${children.length} 条回复` : "收起回复"}
                </Button>
              ) : (
                <span />
              )}

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => onLike(node.id)}>
                  <ThumbsUp className="mr-1 size-4" />
                  点赞 {node.like ? `(${node.like})` : ""}
                </Button>
                <Button size="sm" variant="outline" onClick={() => onReply(node.id, node.nickname)}>
                  <ReplyIcon className="mr-1 size-4" />
                  回复
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && hasChildren ? (
          <motion.div
            key={`replies-${node.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden border-t bg-background/50"
          >
            <div className="space-y-3 p-3">
              {totalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    第 {safePage} / {totalPages} 页（每页 {pageSize} 条）
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={safePage <= 1}
                      onClick={() => setPage(Math.max(1, safePage - 1))}
                    >
                      上一页
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              ) : null}

              {pagedReplies.map((child) => (
                <ReplyItem
                  key={child.id}
                  node={child}
                  rootFloor={floor}
                  replyFloor={replyIndexById.get(String(child.id)) || 1}
                  replyTargetFloor={getReplyTargetFloor(child.pid)}
                  onLike={onLike}
                  onReply={onReply}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function Comments({
  kind,
  targetId,
}: {
  kind: "blog" | "news";
  targetId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [total, setTotal] = useState(0);
  const [visibleFloors, setVisibleFloors] = useState(10);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [content, setContent] = useState("");

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyPid, setReplyPid] = useState<string | null>(null);
  const [replyPname, setReplyPname] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const commentsUrl = `/api/${kind}/${targetId}/comments`;

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(commentsUrl, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error("LOAD_FAILED");
      const nextComments = (json.data.comments || []) as CommentNode[];
      setComments(nextComments);
      setTotal(Number(json.data.total) || 0);
      setVisibleFloors((prev) => {
        const base = Math.max(prev || 0, 10);
        return nextComments.length ? Math.min(base, nextComments.length) : 10;
      });
    } catch {
      setComments([]);
      setTotal(0);
      setVisibleFloors(10);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentsUrl]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setVisibleFloors((prev) => {
          if (prev >= comments.length) return prev;
          return Math.min(prev + 10, comments.length);
        });
      },
      { root: null, rootMargin: "300px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [comments.length]);

  const submit = async (payload: { content: string; pid?: string; pname?: string }) => {
    setSubmitting(true);
    try {
      const res = await fetch(commentsUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error("SUBMIT_FAILED");
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const onLike = async (id: string) => {
    try {
      const res = await fetch(`/api/comments/${id}/like`, { method: "POST" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      await load();
    } catch {
      // ignore
    }
  };

  const onReply = (pid: string, pname: string) => {
    setReplyPid(pid);
    setReplyPname(pname);
    setReplyContent("");
    setReplyOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">评论（{total}）</CardTitle>
        <Button
          size="sm"
          disabled={submitting || !content.trim()}
          onClick={() => {
            if (!content.trim()) return;
            submit({ content });
            setContent("");
          }}
        >
          发布
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <MarkdownEditor
          value={content}
          onChange={setContent}
          height={200}
          preview="live"
          placeholder="写下你的评论（支持 Markdown）"
        />

        {loading ? (
          <div className="text-sm text-muted-foreground">加载中...</div>
        ) : !comments.length ? (
          <div className="text-sm text-muted-foreground">还没有评论，快来发表吧~</div>
        ) : (
          <div className="space-y-3">
            {comments.slice(0, visibleFloors).map((c, idx) => (
              <RootComment key={c.id} node={c} floor={idx + 1} onLike={onLike} onReply={onReply} />
            ))}

            <div ref={loadMoreRef} className="py-2 text-center text-xs text-muted-foreground">
              {visibleFloors >= comments.length
                ? "没有更多楼层了"
                : `继续向下滚动加载更多（剩余 ${comments.length - visibleFloors} 层）`}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              回复 {replyPname ? <span className="font-medium">{replyPname}</span> : ""}
            </DialogTitle>
          </DialogHeader>
          <MarkdownEditor
            value={replyContent}
            onChange={setReplyContent}
            height={220}
            preview="live"
            placeholder="写下你的回复（支持 Markdown）"
          />
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setReplyOpen(false)}
              type="button"
            >
              取消
            </Button>
            <Button
              disabled={submitting || !replyContent.trim() || !replyPid}
              onClick={async () => {
                if (!replyPid || !replyContent.trim()) return;
                await submit({
                  content: replyContent,
                  pid: replyPid,
                  pname: replyPname || "",
                });
                setReplyOpen(false);
              }}
              type="button"
            >
              回复
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
