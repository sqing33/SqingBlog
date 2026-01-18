"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminLoginCard() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const login = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error("LOGIN_FAILED");
      router.push("/admin");
      router.refresh();
    } catch {
      setMessage("登录失败：请检查账号或密码");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>后台管理登录</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? (
            <div className="rounded-md border bg-muted px-3 py-2 text-sm">
              {message}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>用户名</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>密码</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="默认：admin"
            />
          </div>

          <Button
            className="w-full"
            disabled={loading || !username || !password}
            onClick={login}
            type="button"
          >
            {loading ? "登录中..." : "登录"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

