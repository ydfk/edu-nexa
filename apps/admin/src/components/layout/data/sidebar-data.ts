import {
  BookOpenCheck,
  CalendarRange,
  ClipboardList,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  School2,
  Settings,
  Soup,
  UserCog,
  Users,
} from "lucide-react";
import type { AppRole } from "@/lib/app-shell";
import type { SidebarData } from "../types";

export function buildSidebarData(
  roles: string[],
  user: { displayName: string; isDemo?: boolean; phone: string },
): SidebarData {
  const isAdmin = roles.includes("admin");
  const isTeacher = roles.includes("teacher");
  const isGuardian = roles.includes("guardian");
  const isAdminOrTeacher = isAdmin || isTeacher;
  const canManageSystemSettings = isAdmin && !user.isDemo;

  return {
    user: {
      name: user.displayName,
      phone: user.phone,
      avatar: "",
      roles,
    },
    navGroups: [
      {
        title: "概览",
        items: [{ title: "工作台", url: "/", icon: LayoutDashboard }],
      },
      {
        title: "管理",
        items: [
          ...(isAdmin
            ? [{ title: "教师管理", url: "/teachers", icon: UserCog }]
            : []),
          ...(isAdminOrTeacher
            ? [
                { title: "学校管理", url: "/schools", icon: School2 },
                { title: "家长管理", url: "/guardians", icon: Users },
                { title: "学生管理", url: "/students", icon: GraduationCap },
                { title: "缴费管理", url: "/payments", icon: CreditCard },
              ]
            : []),
          ...(isGuardian
            ? [{ title: "我的学生", url: "/students", icon: GraduationCap }]
            : []),
        ],
      },
      {
        title: "记录",
        items: [
          { title: "用餐记录", url: "/meal-records", icon: Soup },
          { title: "作业记录", url: "/homework-records", icon: BookOpenCheck },
          ...(isAdminOrTeacher
            ? [{ title: "每日作业", url: "/daily-homework", icon: ClipboardList }]
            : []),
        ],
      },
      {
        title: "设置",
        items: [
          { title: "个人设置", url: "/settings", icon: UserCog },
          ...(isAdminOrTeacher
            ? [{ title: "服务日历", url: "/service-calendar", icon: CalendarRange }]
            : []),
          ...(canManageSystemSettings
            ? [{ title: "系统设置", url: "/settings/system", icon: Settings }]
            : []),
        ],
      },
    ].filter((group) => group.items.length > 0),
  };
}

export const adminRoles: AppRole[] = ["admin", "teacher", "guardian"];
