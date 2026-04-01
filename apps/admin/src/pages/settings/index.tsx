import { UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageContent } from "@/components/page-content";
import { useAdminSession } from "@/lib/auth/session";

const roleMap: Record<string, string> = {
  admin: "管理员",
  teacher: "教师",
  guardian: "监护人",
};

export default function SettingsProfilePage() {
  const session = useAdminSession();
  const user = session.user;

  return (
    <PageContent>
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">个人资料</h1>
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
              <span className="text-sm text-muted-foreground">手机号</span>
              <span className="text-sm font-medium">{user?.phone || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">显示名称</span>
              <span className="text-sm font-medium">{user?.displayName || "-"}</span>
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
            <CardTitle>账号状态</CardTitle>
            <CardDescription>当前登录会话信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">登录状态</span>
              <Badge>{session.token ? "已登录" : "未登录"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">权限级别</span>
              <span className="text-sm font-medium">
                {user?.roles.includes("admin") ? "超级管理员" : user?.roles.includes("teacher") ? "教师" : "监护人"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </PageContent>
  );
}
