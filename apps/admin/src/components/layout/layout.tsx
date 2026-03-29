import { LogOut } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { clearAdminSession, useAdminSession } from "@/lib/auth/session";
import { getPageMeta } from "@/lib/app-shell";
import { AppSidebar } from "./app-sidebar";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const pageMeta = getPageMeta(location.pathname);
  const session = useAdminSession();

  function handleLogout() {
    clearAdminSession();
    navigate("/auth/login", { replace: true });
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-svh bg-[radial-gradient(circle_at_top_left,_rgba(40,118,90,0.12),_transparent_32%),linear-gradient(180deg,_rgba(249,247,241,0.96),_rgba(255,255,255,0.98))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(98,196,150,0.18),_transparent_30%),linear-gradient(180deg,_rgba(14,22,20,0.98),_rgba(11,16,15,1))]">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{pageMeta.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {pageMeta.description}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground md:block">
              今天重点关注晚辅到校、用餐登记与作业回传
            </div>
            <div className="hidden min-w-0 rounded-2xl border bg-background/90 px-3 py-2 text-right md:block">
              <p className="truncate text-sm font-medium">
                {session.user?.displayName || "未登录"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {session.user?.phone || "未绑定手机号"} ·{" "}
                {session.user?.roles.join(" / ") || "未分配角色"}
              </p>
            </div>
            <ThemeToggle />
            <Button onClick={handleLogout} size="sm" type="button" variant="outline">
              <LogOut className="size-4" />
              退出
            </Button>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
