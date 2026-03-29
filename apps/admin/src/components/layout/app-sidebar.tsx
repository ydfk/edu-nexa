import { NavLink, useLocation } from "react-router-dom";
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
  SidebarRail,
} from "@/components/ui/sidebar";
import { appNavigation } from "@/lib/app-shell";

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar collapsible="none" className="sticky top-0 h-svh border-r">
      <SidebarHeader className="border-b px-4 py-5">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-sidebar-foreground/60">
            学栖 · EduNexa
          </p>
          <h2 className="text-xl font-semibold tracking-tight">托管运营后台</h2>
          <p className="text-sm text-sidebar-foreground/70">
            聚合校区、学生、晚辅与家校反馈
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        {appNavigation.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
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
      <SidebarRail />
    </Sidebar>
  );
}
