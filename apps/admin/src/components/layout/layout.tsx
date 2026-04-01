import { LogOut } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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

  const displayName = session.user?.displayName || "未登录";
  const avatarText = displayName.slice(0, 1);
  const roleLabels = mapRoles(session.user?.roles || []);

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset className="min-h-svh bg-muted/30">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:ml-[calc(var(--sidebar-width)+theme(spacing.4))]">
          <div className="flex h-16 w-full items-center gap-3 px-4 md:px-6">
            <SidebarTrigger className="-ml-1 md:hidden" />
            <Separator orientation="vertical" className="h-4" />
            <div className="min-w-0 flex-1">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>管理后台</BreadcrumbPage>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{pageMeta.title}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              {roleLabels.map((item) => (
                <Badge key={item} variant="secondary">
                  {item}
                </Badge>
              ))}
            </div>
            <ThemeToggle />
            <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2">
              <Avatar className="size-8">
                <AvatarFallback>{avatarText}</AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 md:block">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {session.user?.phone || "-"}
                </p>
              </div>
            </div>
            <Button onClick={handleLogout} size="sm" type="button" variant="outline">
              <LogOut data-icon="inline-start" />
              退出
            </Button>
          </div>
        </header>
        <main className="flex flex-1 flex-col p-4 md:mr-0 md:mb-6 md:ml-[calc(var(--sidebar-width)+theme(spacing.4))] md:pr-6">
          <div className="flex w-full flex-1 flex-col gap-6">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function mapRoles(roles: string[]) {
  const roleMap: Record<string, string> = {
    admin: "管理员",
    guardian: "监护人",
    teacher: "教师",
  };

  return roles.map((item) => roleMap[item] || item);
}
