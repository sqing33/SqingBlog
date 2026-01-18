"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">账号设置</h1>

      {message ? (
        <div className="rounded-md border bg-muted px-3 py-2 text-sm">{message}</div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">头像</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="h-16 w-16 overflow-hidden rounded-full border bg-muted">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <Input
            type="file"
            accept="image/*"
            disabled={avatarUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadAvatar(file);
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">资料</CardTitle>
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
            />
          </div>
          <div className="space-y-2">
            <Label>昵称</Label>
            <Input
              value={profile.nickname}
              onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>手机号</Label>
            <Input
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>邮箱</Label>
            <Input
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
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
              <SelectTrigger>
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
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">账号</CardTitle>
          <Button size="sm" disabled={saving} onClick={saveAccount}>
            保存账号设置
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>新密码（留空则不改）</Label>
            <Input
              type="password"
              value={accountPassword}
              onChange={(e) => setAccountPassword(e.target.value)}
              placeholder="******"
            />
          </div>
          <div className="text-sm text-muted-foreground sm:pt-8">
            当前实现与旧系统兼容：密码使用 SHA256 存储（后续可升级 bcrypt）。
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

