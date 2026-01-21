"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type BlogRow = {
  id: string;
  title: string;
  category: string;
  create_time: string;
  nickname: string;
  coverUrl: string | null;
  isPinned?: boolean;
  pinnedTime?: string | null;
};

type SortKey = keyof Pick<
  BlogRow,
  "id" | "title" | "category" | "nickname" | "create_time"
>;
type SortDir = "asc" | "desc";

function toggleDir(dir: SortDir) {
  return dir === "asc" ? "desc" : "asc";
}

function compareBasic(a: string, b: string) {
  return a.localeCompare(b, "zh-CN", { numeric: true, sensitivity: "base" });
}

function parseTime(value: string) {
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

export function AdminBlogPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState<BlogRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("create_time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const load = async (kw?: string) => {
    setLoading(true);
    setSelected({});
    try {
      const api = new URL("/api/blog", window.location.origin);
      api.searchParams.set("page", "1");
      api.searchParams.set("pageSize", "50");
      if (kw) api.searchParams.set("keyword", kw);
      const res = await fetch(api.toString(), { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error("LOAD_FAILED");
      const pinnedArr = Array.isArray(json?.data?.pinnedArr) ? json.data.pinnedArr : [];
      const blogArr = Array.isArray(json?.data?.blogArr) ? json.data.blogArr : [];
      setItems([...pinnedArr, ...blogArr]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteBlog = async (id: string) => {
    if (!confirm("确认删除该帖子？")) return;
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error("DELETE_FAILED");
      await load(keyword);
    } catch {
      alert("删除失败");
    }
  };

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  );

  const sortedItems = useMemo(() => {
    const withIndex = items.map((item, index) => ({ item, index }));
    withIndex.sort((a, b) => {
      const left = a.item;
      const right = b.item;

      let cmp = 0;
      if (sortKey === "create_time") {
        cmp = parseTime(left.create_time) - parseTime(right.create_time);
      } else {
        cmp = compareBasic(String(left[sortKey] || ""), String(right[sortKey] || ""));
      }

      if (cmp === 0) return a.index - b.index;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return withIndex.map((x) => x.item);
  }, [items, sortDir, sortKey]);

  useEffect(() => {
    const total = sortedItems.length;
    const selectedCount = sortedItems.filter((item) => selected[item.id]).length;
    const el = selectAllRef.current;
    if (!el) return;
    el.indeterminate = selectedCount > 0 && selectedCount < total;
  }, [selected, sortedItems]);

  const toggleSort = (key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => toggleDir(d));
        return prev;
      }
      setSortDir(key === "create_time" ? "desc" : "asc");
      return key;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllVisible = (checked: boolean) => {
    if (!sortedItems.length) return;
    setSelected((prev) => {
      const next = { ...prev };
      for (const row of sortedItems) next[row.id] = checked;
      return next;
    });
  };

  const bulkDelete = async () => {
    if (deleting) return;
    if (!selectedIds.length) return;
    if (!confirm(`确认删除选中的 ${selectedIds.length} 条帖子？`)) return;

    setDeleting(true);
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
        const json = await res.json().catch(() => null);
        if (res.status === 401) {
          router.push("/admin/login");
          return;
        }
        if (!res.ok || !json?.ok) throw new Error("DELETE_FAILED");
      }
      await load(keyword);
    } catch {
      alert("批量删除失败（可能部分已删除）");
      await load(keyword);
    } finally {
      setDeleting(false);
    }
  };

  const togglePinned = async (id: string, nextPinned: boolean) => {
    try {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pinned: nextPinned }),
      });
      const json = await res.json().catch(() => null);
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error("PIN_FAILED");
      await load(keyword);
    } catch {
      alert(nextPinned ? "置顶失败" : "取消置顶失败");
    }
  };

  const SortHeader = ({
    label,
    k,
    className,
  }: {
    label: string;
    k: SortKey;
    className?: string;
  }) => {
    const active = sortKey === k;
    const arrow = active ? (sortDir === "asc" ? "▲" : "▼") : "";
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={className ? className : ""}
      >
        <span className="inline-flex items-center gap-1">
          <span>{label}</span>
          <span className="text-xs text-muted-foreground">{arrow}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold">帖子管理</h1>
        <div className="mt-1 text-sm text-muted-foreground">
          搜索帖子并进行删除操作
        </div>
      </div>

      <Card className="shrink-0">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">筛选</CardTitle>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">
              已选 {selectedIds.length} 条
            </div>
            <Button
              size="sm"
              variant="destructive"
              disabled={!selectedIds.length || deleting}
              onClick={bulkDelete}
              type="button"
            >
              {deleting ? "删除中..." : "批量删除"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索标题/内容"
          />
          <Button onClick={() => load(keyword)} type="button">
            搜索
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setKeyword("");
              load("");
            }}
            type="button"
          >
            重置
          </Button>
        </CardContent>
      </Card>

      <Card className="min-h-0 flex-1">
        <CardHeader>
          <CardTitle className="text-base">列表</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex flex-1 flex-col">
          {loading ? (
            <div className="text-sm text-muted-foreground">加载中...</div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b text-left">
                    <th className="py-2 pr-2">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={
                          !!sortedItems.length &&
                          sortedItems.every((row) => Boolean(selected[row.id]))
                        }
                        onChange={(e) => toggleAllVisible(e.target.checked)}
                        aria-label="全选"
                      />
                    </th>
                    <th className="py-2 pr-2">
                      <SortHeader label="ID" k="id" />
                    </th>
                    <th className="py-2 pr-2">
                      <SortHeader label="标题" k="title" />
                    </th>
                    <th className="py-2 pr-2">
                      <SortHeader label="分类" k="category" />
                    </th>
                    <th className="py-2 pr-2">
                      <SortHeader label="作者" k="nickname" />
                    </th>
                    <th className="py-2 pr-2">置顶</th>
                    <th className="py-2 pr-2">
                      <SortHeader label="发布时间" k="create_time" />
                    </th>
                    <th className="py-2 pr-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((b) => (
                    <tr key={b.id} className="border-b">
                      <td className="py-2 pr-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selected[b.id])}
                          onChange={() => toggleOne(b.id)}
                          aria-label={`选择帖子 ${b.id}`}
                        />
                      </td>
                      <td className="py-2 pr-2">{b.id}</td>
                      <td className="py-2 pr-2">{b.title}</td>
                      <td className="py-2 pr-2">
                        <Badge variant="secondary">{b.category}</Badge>
                      </td>
                      <td className="py-2 pr-2">{b.nickname}</td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          {b.isPinned ? (
                            <Badge variant="secondary">置顶</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                          <Button
                            size="sm"
                            variant={b.isPinned ? "secondary" : "outline"}
                            onClick={() => togglePinned(b.id, !b.isPinned)}
                            type="button"
                          >
                            {b.isPinned ? "取消置顶" : "置顶"}
                          </Button>
                        </div>
                      </td>
                      <td className="py-2 pr-2">{b.create_time}</td>
                      <td className="py-2 pr-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteBlog(b.id)}
                          type="button"
                        >
                          删除
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!items.length ? (
                    <tr>
                      <td
                        className="py-6 text-center text-sm text-muted-foreground"
                        colSpan={8}
                      >
                        暂无数据
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
