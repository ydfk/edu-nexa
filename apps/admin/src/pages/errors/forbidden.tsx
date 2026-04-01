import { ShieldOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.28))] flex-col items-center justify-center gap-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-destructive/10">
        <ShieldOff className="size-10 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">403</h1>
        <h2 className="text-xl font-semibold">访问被禁止</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          您没有权限访问此页面，请联系管理员获取相应权限后再试。
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          返回上一页
        </Button>
        <Button onClick={() => navigate("/")}>回到首页</Button>
      </div>
    </div>
  );
}
