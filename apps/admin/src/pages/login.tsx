import { startTransition, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithPassword } from "@/lib/api/auth";
import {
  hasAdminAccess,
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
      const payload = await loginWithPassword({
        password,
        phone: trimmedPhone,
      });

      const session: AdminSession = {
        token: payload.token,
        user: payload.user,
      };

      if (!hasAdminAccess(session)) {
        toast.error("当前账号没有管理端权限");
        return;
      }

      saveAdminSession(session);
      toast.success("登录成功");

      const nextPath =
        typeof location.state?.from === "string" && location.state.from
          ? location.state.from
          : "/";

      startTransition(() => {
        navigate(nextPath, { replace: true });
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(40,118,90,0.16),_transparent_28%),linear-gradient(180deg,_rgba(249,247,241,0.98),_rgba(255,255,255,1))] p-4 dark:bg-[radial-gradient(circle_at_top,_rgba(98,196,150,0.18),_transparent_25%),linear-gradient(180deg,_rgba(14,22,20,0.98),_rgba(11,16,15,1))]">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="space-y-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <CardTitle className="text-2xl">管理端密码登录</CardTitle>
          <p className="text-sm text-muted-foreground">
            管理员、教师等后台角色统一使用手机号 + 密码登录。
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <Input
                id="phone"
                autoComplete="username"
                placeholder="13800000000"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="请输入登录密码"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
              小程序端不复用这里的密码流程，后续单独走微信登录态 + 获取手机号。
            </div>
            <Button className="w-full" disabled={submitting} type="submit">
              {submitting ? "登录中..." : "登录"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
