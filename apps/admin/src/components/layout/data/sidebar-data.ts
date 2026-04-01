import {
  BarChart3,
  BookOpenCheck,
  Bug,
  CalendarRange,
  ClipboardList,
  FileX,
  GraduationCap,
  LayoutDashboard,
  Lock,
  Palette,
  School2,
  ServerOff,
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
    teams: [
      { name: "学栖 · EduNexa", logo: GraduationCap, plan: "管理后台" },
    ],
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
            ? [{ title: "教师账号", url: "/teachers", icon: UserCog }]
            : []),
          ...(isAdminOrTeacher
            ? [
                { title: "学校管理", url: "/schools", icon: School2 },
                { title: "监护人", url: "/guardians", icon: Users },
                { title: "学生管理", url: "/students", icon: Users },
              ]
            : []),
          ...(isGuardian
            ? [{ title: "我的学生", url: "/students", icon: Users }]
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
        title: "其他",
        items: [
          {
            title: "系统设置",
            icon: Settings,
            items: [
              { title: "个人资料", url: "/settings", icon: UserCog },
              { title: "外观设置", url: "/settings/appearance", icon: Palette },
            ],
          },
          {
            title: "错误页面",
            icon: Bug,
            items: [
              { title: "访问限制", url: "/errors/unauthorized", icon: Lock },
              { title: "页面不存在", url: "/errors/not-found", icon: FileX },
              { title: "服务器错误", url: "/errors/server-error", icon: ServerOff },
            ],
          },
        ],
      },
    ].filter((group) => group.items.length > 0),
  };
}

export const adminRoles: AppRole[] = ["admin", "teacher", "guardian"];
