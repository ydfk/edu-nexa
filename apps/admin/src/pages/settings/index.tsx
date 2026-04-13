import { useState } from "react";
import { UserCircle } from "lucide-react";
import { toast } from "sonner";
import { PageContent } from "@/components/page-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { changePassword, updateProfile } from "@/lib/api/auth";
import {
  updateAdminSessionUser,
  useAdminSession,
} from "@/lib/auth/session";

const roleMap: Record<string, string> = {
  admin: "管理员",
  teacher: "教师",
  guardian: "家长",
};

const initialPasswordForm = {
  confirmPassword: "",
  currentPassword: "",
  newPassword: "",
};

export default function SettingsProfilePage() {
  const session = useAdminSession();
  const user = session.user;

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function handleSaveProfile() {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast.error("名称不能为空");
      return;
    }
    if (!user) {
      toast.error("当前用户不存在");
      return;
    }

    setProfileSaving(true);
    try {
      const updatedUser = await updateProfile({ displayName: trimmedName });
      updateAdminSessionUser(updatedUser);
      setDisplayName(updatedUser.displayName);
      toast.success("个人设置已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error("请填写当前密码和新密码");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("两次输入的新密码不一致");
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(initialPasswordForm);
      toast.success("密码已修改");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "修改失败");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <PageContent>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">个人设置</h1>
          <p className="text-sm text-muted-foreground">查看和管理您的账号信息</p>
        </div>
        <Separator />

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserCircle className="size-8" />
                </div>
                <div>
                  <CardTitle>{user?.displayName || "未知用户"}</CardTitle>
                  <CardDescription>{user?.phone || "-"}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">用户 ID</span>
                <span className="text-sm font-medium">{user?.id || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">账号</span>
                <span className="text-sm font-medium">{user?.phone || "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">账号角色</span>
                <div className="flex gap-1.5">
                  {(user?.roles || []).map((role) => (
                    <Badge key={role} variant="secondary">
                      {roleMap[role] || role}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>修改当前账号显示名称</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="display-name">名称</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                  <Label htmlFor="profile-phone">账号</Label>
                <Input id="profile-phone" disabled value={user?.phone || ""} />
              </div>
              <div className="flex justify-end">
                <Button disabled={profileSaving} onClick={handleSaveProfile}>
                  {profileSaving ? "保存中..." : "保存基本信息"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>修改密码</CardTitle>
            <CardDescription>修改当前登录账号的密码</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="current-password">当前密码</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    currentPassword: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">新密码</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    newPassword: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">确认新密码</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex justify-end">
              <Button disabled={passwordSaving} onClick={handleChangePassword}>
                {passwordSaving ? "保存中..." : "修改密码"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContent>
  );
}
