import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  CalendarRange,
  ClipboardList,
  LayoutDashboard,
  School2,
  Soup,
  UserCog,
  Users,
} from "lucide-react";

export type AppRole = "admin" | "teacher" | "guardian";

type AppNavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  roles: AppRole[];
};

type AppNavGroup = {
  items: AppNavItem[];
  title: string;
};

export const appNavigation: AppNavGroup[] = [
  {
    title: "概览",
    items: [
      {
        href: "/",
        icon: LayoutDashboard,
        label: "工作台",
        roles: ["admin", "teacher", "guardian"],
      },
    ],
  },
  {
    title: "设置",
    items: [
      {
        href: "/teachers",
        icon: UserCog,
        label: "教师管理",
        roles: ["admin"],
      },
      {
        href: "/schools",
        icon: School2,
        label: "学校",
        roles: ["admin", "teacher"],
      },
      {
        href: "/guardians",
        icon: Users,
        label: "家长管理",
        roles: ["admin", "teacher"],
      },
      {
        href: "/students",
        icon: Users,
        label: "学生",
        roles: ["admin", "teacher"],
      },
      {
        href: "/service-calendar",
        icon: CalendarRange,
        label: "服务日历",
        roles: ["admin", "teacher"],
      },
    ],
  },
  {
    title: "记录",
    items: [
      {
        href: "/meal-records",
        icon: Soup,
        label: "用餐记录",
        roles: ["admin", "teacher", "guardian"],
      },
      {
        href: "/homework-records",
        icon: BookOpenCheck,
        label: "作业记录",
        roles: ["admin", "teacher", "guardian"],
      },
      {
        href: "/daily-homework",
        icon: ClipboardList,
        label: "每日作业",
        roles: ["admin", "teacher"],
      },
    ],
  },
];

const flatNavigation = appNavigation.flatMap((group) => group.items);

export function getPageMeta(pathname: string) {
  const matched = flatNavigation.find((item) => item.href === pathname);
  if (matched) {
    return {
      title: matched.label,
      description: "",
    };
  }

  return {
    title: "EduNexa",
    description: "",
  };
}

export function getNavigationByRoles(roles: string[]) {
  return appNavigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.some((role) => roles.includes(role))),
    }))
    .filter((group) => group.items.length > 0);
}

export function hasAnyRole(roles: string[], expected: AppRole[]) {
  return expected.some((role) => roles.includes(role));
}
