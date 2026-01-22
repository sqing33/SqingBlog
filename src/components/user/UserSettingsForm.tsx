"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Home, LockKeyhole, UserCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import "@/styles/glassmorphism.scss";

type UserProfile = {
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

export function UserSettingsForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [avatarUploading, setAvatarUploading] = useState(false);

  const [accountPassword, setAccountPassword] = useState("");

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/profile", { cache: "no-store" });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error("LOAD_FAILED");
      setProfile(json.data);
    } catch {
      setProfile(null);
      setMessage("无法加载用户信息");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadAvatar = async (file: File) => {
    setAvatarUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload?folder=avatars", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok || json?.errno !== 0) throw new Error("UPLOAD_FAILED");

      const avatarUrl = json.data.url as string;
      const res2 = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ avatarUrl }),
      });
      const json2 = await res2.json();
      if (res2.status === 401) {
        router.push("/login");
        return;
      }
      if (!res2.ok || !json2?.ok) throw new Error("UPDATE_FAILED");

      setMessage("头像已更新");
      await load();
    } catch {
      setMessage("头像更新失败");
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/profile/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: profile.username,
          nickname: profile.nickname,
          phone: profile.phone,
          email: profile.email,
          gender: profile.gender,
          birthday: profile.birthday,
        }),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error("SAVE_FAILED");
      setMessage("资料已保存");
      await load();
    } catch {
      setMessage("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const saveAccount = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/account/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          password: accountPassword,
          phone: profile.phone,
          email: profile.email,
        }),
      });
      const json = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok || !json?.ok) throw new Error("SAVE_FAILED");
      setAccountPassword("");
      setMessage("账号设置已更新");
      await load();
    } catch {
      setMessage("账号设置更新失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">加载中...</div>;
  }

  if (!profile) {
    return <div className="text-sm text-muted-foreground">无法加载用户信息</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">账号设置</h1>
          <div className="mt-1 text-sm text-muted-foreground">更新头像、资料与密码</div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button asChild variant="secondary" className="justify-between sm:w-auto">
            <Link href="/user">
              返回个人中心 <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between sm:w-auto">
            <Link href="/blog">
              返回博客首页 <Home className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {message ? (
        <div className="rounded-xl border bg-muted/40 px-4 py-3 text-sm">{message}</div>
      ) : null}

      <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,_1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <Card className="w-full min-w-0 rounded-2xl glass-card">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base">资料</CardTitle>
                <div className="text-xs text-muted-foreground">展示信息与联系方式</div>
              </div>
              <Button size="sm" disabled={saving} onClick={saveProfile}>
                保存资料
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>用户名</Label>
                <Input
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  className="bg-transparent/50"
                />
              </div>
              <div className="space-y-2">
                <Label>昵称</Label>
                <Input
                  value={profile.nickname}
                  onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
                  className="bg-transparent/50"
                />
              </div>
              <div className="space-y-2">
                <Label>手机号</Label>
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="bg-transparent/50"
                />
              </div>
              <div className="space-y-2">
                <Label>邮箱</Label>
                <Input
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="bg-transparent/50"
                />
              </div>
              <div className="space-y-2">
                <Label>性别</Label>
                <Select
                  value={profile.gender || "无"}
                  onValueChange={(v) =>
                    setProfile({ ...profile, gender: v === "无" ? null : v })
                  }
                >
                  <SelectTrigger className="bg-transparent/50">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="男">男</SelectItem>
                    <SelectItem value="女">女</SelectItem>
                    <SelectItem value="无">无</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>生日（YYYY-MM-DD）</Label>
                <Input
                  value={profile.birthday || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, birthday: e.target.value || null })
                  }
                  placeholder="1999-05-20"
                  className="bg-transparent/50"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="w-full min-w-0 rounded-2xl glass-card">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base">账号</CardTitle>
                <div className="text-xs text-muted-foreground">修改密码（留空则不改）</div>
              </div>
              <Button size="sm" disabled={saving} onClick={saveAccount}>
                保存账号设置
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>新密码</Label>
                <Input
                  type="password"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  placeholder="******"
                  className="bg-transparent/50"
                />
              </div>
              <div className="rounded-xl border bg-background/40 p-3 text-sm text-muted-foreground">
                当前实现与旧系统兼容：密码使用 SHA256 存储（后续可升级 bcrypt）。
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card className="w-full min-w-0 rounded-2xl glass-card">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">头像</CardTitle>
              <div className="text-xs text-muted-foreground">选择一张图片即可更新</div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 overflow-hidden rounded-2xl border bg-muted">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <UserCircle2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  disabled={avatarUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadAvatar(file);
                  }}
                  className="bg-transparent/50"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                头像上传后会自动保存，无需额外点击。
              </div>
            </CardContent>
          </Card>

          <Card className="w-full min-w-0 rounded-2xl glass-card">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base">快捷入口</CardTitle>
              <div className="text-xs text-muted-foreground">继续管理你的内容</div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="secondary" className="w-full justify-between">
                <Link href="/user?section=blogs">
                  我的发帖 <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" className="w-full justify-between">
                <Link href="/user?section=collections">
                  我的收藏 <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" className="w-full justify-between">
                <Link href="/user?section=feedback">
                  我的反馈 <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <div className="rounded-xl border bg-background/40 p-3 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <LockKeyhole className="mt-0.5 h-4 w-4" />
                  <div>建议使用强密码，并避免与其他网站重复。</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
