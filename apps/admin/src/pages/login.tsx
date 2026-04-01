import { startTransition, useState } from "react";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithPassword } from "@/lib/api/auth";
import {
  hasBackofficeAccess,
  saveAdminSession,
  type AdminSession,
} from "@/lib/auth/session";

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedPhone = phone.trim();
    if (!trimmedPhone || !password) {
      toast.error("请填写手机号和密码");
      return;
    }

    setSubmitting(true);
    try {
      const payload = await loginWithPassword({ password, phone: trimmedPhone });
      const session: AdminSession = { token: payload.token, user: payload.user };

      if (!hasBackofficeAccess(session)) {
        toast.error("当前账号没有管理端权限");
        return;
      }

      saveAdminSession(session);
      toast.success("登录成功");

      const nextPath =
        typeof location.state?.from === "string" && location.state.from
          ? location.state.from
          : "/";

      startTransition(() => { navigate(nextPath, { replace: true }); });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* 左侧品牌区（仅桌面端显示） */}
      <div className="relative hidden flex-col bg-muted p-10 text-foreground lg:flex dark:border-r">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(40,118,90,0.2),_transparent_60%)]" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </div>
          <span className="text-lg font-bold">学栖 · EduNexa</span>
        </div>
        <div className="relative mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "学栖帮助我们高效管理学生的日常用餐与作业，让教育工作更轻松、更专注。"
            </p>
            <footer className="text-sm text-muted-foreground">— 某教育机构管理员</footer>
          </blockquote>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-4" />
            </div>
            <span className="font-bold">学栖 · EduNexa</span>
          </div>

          <Card className="border-none shadow-none">
            <CardHeader className="px-0">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <CardTitle className="text-2xl">管理端登录</CardTitle>
              <CardDescription>使用手机号和密码登录管理后台</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div className="grid gap-2">
                  <Label htmlFor="phone">手机号</Label>
                  <Input
                    id="phone"
                    autoComplete="username"
                    placeholder="13800000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="请输入登录密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button className="mt-2 w-full" disabled={submitting} type="submit">
                  {submitting ? "登录中..." : "登录"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
