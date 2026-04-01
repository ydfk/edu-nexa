import { ServerCrash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ServerErrorPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.28))] flex-col items-center justify-center gap-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-destructive/10">
        <ServerCrash className="size-10 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">500</h1>
        <h2 className="text-xl font-semibold">服务器错误</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          服务器出现了意外错误，我们正在积极处理中。请稍后再试或联系技术支持。
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => window.location.reload()}>
          刷新页面
        </Button>
        <Button onClick={() => navigate("/")}>回到首页</Button>
      </div>
    </div>
  );
}
