"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import styles from "@/components/auth/authBook.module.css";

export function AuthCard() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");

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
  const [codeCooldownEndsAt, setCodeCooldownEndsAt] = useState<number | null>(
    null,
  );
  const [codeCooldownSeconds, setCodeCooldownSeconds] = useState(0);
  const [codeSentAt, setCodeSentAt] = useState<number | null>(null);

  const [message, setMessage] = useState<string | null>(null);

  const codeCooldownActive = codeCooldownSeconds > 0;

  const codeButtonText = (() => {
    if (sendingCode) return "发送中...";
    if (codeCooldownActive)
      return `验证码有效期5分钟·${codeCooldownSeconds}s后可重发`;
    if (codeSentAt) return "重新获取验证码";
    return "获取验证码";
  })();

  const switchToRegister = () => {
    setMode("register");
    setMessage(null);
  };

  const switchToLogin = () => {
    setMode("login");
    setMessage(null);
  };

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
      if (!res.ok || !json?.ok)
        throw new Error(json?.message || "LOGIN_FAILED");
      router.push("/blog");
      router.refresh();
    } catch {
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
    if (codeCooldownActive) return;
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
      const now = Date.now();
      setMessage(null);
      setCodeSentAt(now);
      setCodeCooldownEndsAt(now + 60 * 1000);
    } catch {
      setMessage("验证码发送失败（请检查邮件配置）");
    } finally {
      setSendingCode(false);
    }
  };

  useEffect(() => {
    if (!codeCooldownEndsAt) {
      setCodeCooldownSeconds(0);
      return;
    }

    const tick = () => {
      const diff = codeCooldownEndsAt - Date.now();
      const seconds = Math.max(0, Math.ceil(diff / 1000));
      setCodeCooldownSeconds(seconds);
      if (seconds === 0) setCodeCooldownEndsAt(null);
    };

    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [codeCooldownEndsAt]);

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
      setMode("login");
    } catch {
      setMessage("注册失败：请检查信息/验证码");
    } finally {
      setRegLoading(false);
    }
  };

  const renderMessageOverlay = () =>
    message ? (
      <div className="absolute left-0 right-0 top-0 z-10">
        <div className="rounded-md border bg-muted/70 px-3 py-2 text-sm shadow-sm">
          {message}
        </div>
      </div>
    ) : null;

  return (
    <div className="mx-auto flex min-h-[100vh] w-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl">
        <div className={styles.scene}>
          <div className={styles.shell}>
            <div
              className={cn(styles.book, mode === "register" && styles.flipped)}
            >
              <div className={styles.spine} aria-hidden="true" />

              <section className={styles.face} aria-label="登录面板">
                <div
                  className={cn("glass-card glass-card--strong", styles.frame)}
                >
                  <div className={styles.spread}>
                    <div className={cn(styles.page, styles.mediaPage)}>
                      <div className={styles.mediaFrame}>
                        <div className={styles.mediaInner}>
                          <Image
                            className={styles.mediaImg}
                            src="/assets/login.gif"
                            alt="登录插图"
                            fill
                            priority
                            unoptimized
                            sizes="(max-width: 768px) 100vw, 520px"
                          />
                        </div>
                      </div>
                    </div>

                    <div className={cn(styles.page, styles.formPage)}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h1 className="text-lg font-semibold tracking-tight">
                            登录 SQBlog
                          </h1>
                          <p className="mt-1 text-sm text-muted-foreground">
                            欢迎回来，继续你的探索之旅
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={switchToRegister}
                          type="button"
                        >
                          去注册
                        </Button>
                      </div>

                      <div className={cn(styles.formBody, "relative")}>
                        {renderMessageOverlay()}
                        <div className={cn(message && "pt-12")}>
                          <form
                            className="grid min-h-[320px] grid-rows-[1fr_1fr_auto] gap-6"
                            onSubmit={(e) => {
                              e.preventDefault();
                              void login();
                            }}
                          >
                            <div className="space-y-2">
                              <Label>用户名 / 手机号 / 邮箱</Label>
                              <Input
                                value={loginIdentifier}
                                onChange={(e) =>
                                  setLoginIdentifier(e.target.value)
                                }
                                placeholder="请输入账号"
                                autoComplete="username"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>密码</Label>
                              <Input
                                type="password"
                                value={loginPassword}
                                onChange={(e) =>
                                  setLoginPassword(e.target.value)
                                }
                                placeholder="请输入密码"
                                autoComplete="current-password"
                              />
                            </div>
                            <Button
                              className="w-full"
                              disabled={
                                loginLoading ||
                                !loginIdentifier ||
                                !loginPassword
                              }
                              type="submit"
                            >
                              {loginLoading ? "登录中..." : "登录"}
                            </Button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section
                className={cn(styles.face, styles.back)}
                aria-label="注册面板"
              >
                <div
                  className={cn("glass-card glass-card--strong", styles.frame)}
                >
                  <div className={styles.spread}>
                    <div className={cn(styles.page, styles.formPage)}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-lg font-semibold tracking-tight">
                            注册 SQBlog
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            创建账号，加入三青的世界
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={switchToLogin}
                          type="button"
                        >
                          去登录
                        </Button>
                      </div>

                      <div className={cn(styles.formBody, "relative")}>
                        {renderMessageOverlay()}
                        <div className={cn("grid gap-4", message && "pt-12")}>
                          <form
                            className="grid gap-4"
                            onSubmit={(e) => {
                              e.preventDefault();
                              void register();
                            }}
                          >
                            <div className="space-y-2">
                              <Label>用户名</Label>
                              <Input
                                value={regUsername}
                                onChange={(e) => setRegUsername(e.target.value)}
                                placeholder="4-16 位"
                                autoComplete="username"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>昵称</Label>
                              <Input
                                value={regNickname}
                                onChange={(e) => setRegNickname(e.target.value)}
                                placeholder="2-10 位"
                                autoComplete="nickname"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>密码</Label>
                              <Input
                                type="password"
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                                placeholder="6-16 位"
                                autoComplete="new-password"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>手机号</Label>
                              <Input
                                value={regPhone}
                                onChange={(e) => setRegPhone(e.target.value)}
                                placeholder="手机号"
                                autoComplete="tel"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>邮箱</Label>
                              <Input
                                value={regEmail}
                                onChange={(e) => setRegEmail(e.target.value)}
                                placeholder="邮箱"
                                autoComplete="email"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>验证码</Label>
                              <div className="relative">
                                <Input
                                  value={regCode}
                                  onChange={(e) => setRegCode(e.target.value)}
                                  placeholder="邮箱验证码"
                                  inputMode="numeric"
                                  autoComplete="one-time-code"
                                  className="pr-32"
                                />
                                <Button
                                  variant="secondary"
                                  className="absolute right-1 top-1 bottom-1 h-auto px-3 text-xs"
                                  disabled={
                                    sendingCode ||
                                    codeCooldownActive ||
                                    !regEmail
                                  }
                                  onClick={sendCode}
                                  type="button"
                                >
                                  {codeButtonText}
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
                              type="submit"
                            >
                              {regLoading ? "注册中..." : "注册"}
                            </Button>
                          </form>
                        </div>
                      </div>
                    </div>

                    <div className={cn(styles.page, styles.mediaPage)}>
                      <div className={styles.mediaFrame}>
                        <div className={styles.mediaInner}>
                          <Image
                            className={styles.mediaImg}
                            src="/assets/regist.gif"
                            alt="注册插图"
                            fill
                            unoptimized
                            sizes="(max-width: 768px) 100vw, 520px"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          管理员入口：
          <a className="underline" href="/admin/login">
            /admin/login
          </a>
        </div>
      </div>
    </div>
  );
}
