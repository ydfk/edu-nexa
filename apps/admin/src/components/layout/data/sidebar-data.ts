import {
  BarChart3,
  BookOpenCheck,
  CalendarRange,
  ClipboardList,
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
  user: { displayName: string; phone: string },
): SidebarData {
  const isAdmin = roles.includes("admin");
  const isTeacher = roles.includes("teacher");
  const isGuardian = roles.includes("guardian");
  const isAdminOrTeacher = isAdmin || isTeacher;

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
        items: [
          { title: "工作台", url: "/", icon: LayoutDashboard },
          ...(isAdminOrTeacher
            ? [{ title: "统计看板", url: "/statistics", icon: BarChart3 }]
            : []),
        ],
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
            ? [
                { title: "每日作业", url: "/daily-homework", icon: ClipboardList },
                { title: "服务日历", url: "/service-calendar", icon: CalendarRange },
              ]
            : []),
        ],
      },
      {
        title: "设置",
        items: [
          { title: "个人设置", url: "/settings", icon: UserCog },
          ...(isAdmin
            ? [{ title: "系统设置", url: "/settings/system", icon: Settings }]
            : []),
        ],
      },
    ].filter((group) => group.items.length > 0),
  };
}

export const adminRoles: AppRole[] = ["admin", "teacher", "guardian"];
