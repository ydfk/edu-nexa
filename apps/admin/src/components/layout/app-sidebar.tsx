import { School2 } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { getNavigationByRoles } from "@/lib/app-shell";
import { useAdminSession } from "@/lib/auth/session";

export function AppSidebar() {
  const location = useLocation();
  const session = useAdminSession();
  const navigation = getNavigationByRoles(session.user?.roles || []);
  const roleLabel =
    session.user?.roles.includes("admin")
      ? "管理员"
      : session.user?.roles.includes("teacher")
        ? "教师"
        : session.user?.roles.includes("guardian")
          ? "监护人"
          : "账号";

  return (
    <Sidebar collapsible="offcanvas" className="border-r">
      <SidebarHeader className="gap-3 px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg border bg-background px-3 py-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <School2 />
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">学栖 · EduNexa</p>
            <p className="truncate text-xs text-muted-foreground">管理后台</p>
          </div>
          <Badge variant="secondary" className="group-data-[collapsible=icon]:hidden">
            {roleLabel}
          </Badge>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent className="px-2 py-3">
        {navigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = item.href === location.pathname;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.label}
                        isActive={isActive}
                        className="h-9 rounded-lg"
                      >
                        <NavLink
                          to={item.href}
                          className={cn(
                            isActive &&
                              "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
                          )}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
