import { GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAdminSession } from "@/lib/auth/session";
import {
  fetchRuntimeSettings,
  getSystemBrandParts,
  getSystemDisplayName,
} from "@/lib/runtime-settings";
import { buildSidebarData } from "./data/sidebar-data";
import { NavGroup } from "./nav-group";
import { NavUser } from "./nav-user";

export function AppSidebar() {
  const session = useAdminSession();
  const [systemName, setSystemName] = useState(getSystemDisplayName());
  const systemBrand = getSystemBrandParts(systemName.replace(" 学栖·EduNexa", ""));
  const sidebarData = buildSidebarData(session.user?.roles || [], {
    displayName: session.user?.displayName || "未登录",
    phone: session.user?.phone || "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadRuntimeSettings() {
      const settings = await fetchRuntimeSettings();
      if (!cancelled) {
        setSystemName(getSystemDisplayName(settings.systemNamePrefix));
      }
    }

    void loadRuntimeSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="pointer-events-none opacity-100 hover:bg-transparent active:bg-transparent"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <GraduationCap className="size-4" />
              </div>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <div className="truncate font-semibold">{systemBrand.primary}</div>
                {systemBrand.secondary ? (
                  <div className="truncate text-[11px] font-medium text-sidebar-foreground/65">
                    {systemBrand.secondary}
                  </div>
                ) : null}
                <span className="truncate text-xs">管理后台</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
