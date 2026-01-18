"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AuthCard() {
  const router = useRouter();

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regNickname, setRegNickname] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  const [message, setMessage] = useState<string | null>(null);

  const login = async () => {
    setLoginLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identifier: loginIdentifier,
          password: loginPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.message || "LOGIN_FAILED");
      router.push("/blog");
      router.refresh();
    } catch (err) {
      setMessage("登录失败：请检查账号或密码");
    } finally {
      setLoginLoading(false);
    }
  };

  const sendCode = async () => {
    if (!regEmail) {
      setMessage("请输入邮箱");
      return;
    }
    setSendingCode(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/email-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: regEmail }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error("SEND_FAILED");
      setMessage("验证码已发送（有效期 2 分钟）");
    } catch {
      setMessage("验证码发送失败（请检查邮件配置）");
    } finally {
      setSendingCode(false);
    }
  };

  const register = async () => {
    setRegLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          nickname: regNickname,
          phone: regPhone,
          email: regEmail,
          code: regCode,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error("REGISTER_FAILED");
      setMessage("注册成功，请登录");
    } catch {
      setMessage("注册失败：请检查信息/验证码");
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>登录 / 注册</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? (
            <div className="rounded-md border bg-muted px-3 py-2 text-sm">
              {message}
            </div>
          ) : null}

          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-3">
              <div className="space-y-2">
                <Label>用户名 / 手机号 / 邮箱</Label>
                <Input
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="请输入账号"
                />
              </div>
              <div className="space-y-2">
                <Label>密码</Label>
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="请输入密码"
                />
              </div>
              <Button
                className="w-full"
                disabled={loginLoading || !loginIdentifier || !loginPassword}
                onClick={login}
                type="button"
              >
                {loginLoading ? "登录中..." : "登录"}
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>用户名</Label>
                  <Input
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="4-16 位"
                  />
                </div>
                <div className="space-y-2">
                  <Label>昵称</Label>
                  <Input
                    value={regNickname}
                    onChange={(e) => setRegNickname(e.target.value)}
                    placeholder="2-10 位"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>密码</Label>
                <Input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="6-16 位"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>手机号</Label>
                  <Input
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="手机号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>邮箱</Label>
                  <Input
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="邮箱"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label>验证码</Label>
                  <Input
                    value={regCode}
                    onChange={(e) => setRegCode(e.target.value)}
                    placeholder="邮箱验证码"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="secondary"
                    disabled={sendingCode}
                    onClick={sendCode}
                    type="button"
                  >
                    {sendingCode ? "发送中..." : "获取验证码"}
                  </Button>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={
                  regLoading ||
                  !regUsername ||
                  !regPassword ||
                  !regNickname ||
                  !regPhone ||
                  !regEmail ||
                  !regCode
                }
                onClick={register}
                type="button"
              >
                {regLoading ? "注册中..." : "注册"}
              </Button>
            </TabsContent>
          </Tabs>

          <div className="text-xs text-muted-foreground">
            管理员入口：<a className="underline" href="/admin/login">/admin/login</a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

