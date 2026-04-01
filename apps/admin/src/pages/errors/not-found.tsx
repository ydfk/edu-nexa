import { FileX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.28))] flex-col items-center justify-center gap-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-muted">
        <FileX className="size-10 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">404</h1>
        <h2 className="text-xl font-semibold">页面不存在</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          您访问的页面可能已被删除或暂时不可用，请检查地址是否正确。
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
