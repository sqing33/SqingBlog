"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ApiResponse<T> = { ok?: boolean; data?: T };

type UserRow = {
  id: string;
  username: string;
  nickname: string;
  email: string;
  phone: string;
  create_time: string;
};

export function AdminUsersPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const load = async (kw?: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const qs = kw ? `?keyword=${encodeURIComponent(kw)}` : "";
      const res = await fetch(`/api/admin/users${qs}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResponse<UserRow[]>;
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error("LOAD_FAILED");
      setUsers(
        (json.data ?? []).map((u) => ({
          id: String(u.id),
          username: u.username,
          nickname: u.nickname,
          email: u.email,
          phone: u.phone,
          create_time: u.create_time,
        }))
      );
    } catch {
      setUsers([]);
      setMessage("加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteUser = async (id: string) => {
    if (!confirm("确认删除该用户？")) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
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

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold">用户管理</h1>
        <div className="mt-1 text-sm text-muted-foreground">
          搜索、查看与删除用户
        </div>
      </div>

      <Card className="shrink-0">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">筛选</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="按 ID / 用户名 / 昵称 / 手机 / 邮箱"
          />
          <Button onClick={() => load(keyword)} type="button">
            搜索
          </Button>
          <Button variant="secondary" onClick={() => { setKeyword(""); load(""); }} type="button">
            重置
          </Button>
        </CardContent>
      </Card>

      <Card className="min-h-0 flex-1">
        <CardHeader>
          <CardTitle className="text-base">列表</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex flex-1 flex-col">
          {message ? (
            <div className="text-sm text-muted-foreground">{message}</div>
          ) : null}
          {loading ? (
            <div className="text-sm text-muted-foreground">加载中...</div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b text-left">
                    <th className="py-2 pr-2">ID</th>
                    <th className="py-2 pr-2">用户名</th>
                    <th className="py-2 pr-2">昵称</th>
                    <th className="py-2 pr-2">邮箱</th>
                    <th className="py-2 pr-2">手机</th>
                    <th className="py-2 pr-2">注册时间</th>
                    <th className="py-2 pr-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="py-2 pr-2">{u.id}</td>
                      <td className="py-2 pr-2">{u.username}</td>
                      <td className="py-2 pr-2">{u.nickname}</td>
                      <td className="py-2 pr-2">{u.email}</td>
                      <td className="py-2 pr-2">{u.phone}</td>
                      <td className="py-2 pr-2">{u.create_time}</td>
                      <td className="py-2 pr-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteUser(u.id)}
                          type="button"
                        >
                          删除
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!users.length ? (
                    <tr>
                      <td
                        className="py-6 text-center text-sm text-muted-foreground"
                        colSpan={7}
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
