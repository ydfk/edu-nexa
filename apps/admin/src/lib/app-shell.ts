import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  BookOpenCheck,
  Building2,
  LayoutDashboard,
  Settings,
  Soup,
  Users,
} from "lucide-react";

type AppNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

type AppNavGroup = {
  title: string;
  items: AppNavItem[];
};

export const appNavigation: AppNavGroup[] = [
  {
    title: "运营总览",
    items: [
      {
        href: "/",
        label: "工作台",
        description: "今日运营概览与异常提醒",
        icon: LayoutDashboard,
      },
      {
        href: "/campuses",
        label: "校区管理",
        description: "查看校区容量、班次与服务时段",
        icon: Building2,
      },
      {
        href: "/students",
        label: "学生台账",
        description: "维护学生档案与托管状态",
        icon: Users,
      },
    ],
  },
  {
    title: "晚辅执行",
    items: [
      {
        href: "/meal-records",
        label: "用餐登记",
        description: "跟踪当天晚辅用餐完成情况",
        icon: Soup,
      },
      {
        href: "/homework-records",
        label: "作业记录",
        description: "记录学生作业完成与订正状态",
        icon: BookOpenCheck,
      },
      {
        href: "/guardians",
        label: "家校同步",
        description: "管理家长通知与反馈模板",
        icon: BellRing,
      },
    ],
  },
  {
    title: "系统配置",
    items: [
      {
        href: "/settings",
        label: "基础设置",
        description: "账号权限、接口地址与业务配置",
        icon: Settings,
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
      description: matched.description,
    };
  }

  return {
    title: "学栖 · EduNexa",
    description: "托管机构运营管理底座",
  };
}
