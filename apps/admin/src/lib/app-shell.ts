import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  BookOpenCheck,
  Building2,
  CalendarRange,
  ClipboardList,
  GalleryVerticalEnd,
  LayoutDashboard,
  ScrollText,
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
        description: "维护学生档案、学校班级与服务状态",
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
        href: "/daily-homework",
        label: "每日作业",
        description: "按学校和班级维护当天作业内容",
        icon: ClipboardList,
      },
      {
        href: "/service-calendar",
        label: "服务日历",
        description: "配置哪一天开放用餐和作业辅导",
        icon: CalendarRange,
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
        href: "/home-content",
        label: "首页配置",
        description: "配置小程序首页文案、公告与轮播图",
        icon: GalleryVerticalEnd,
      },
      {
        href: "/integration-guide",
        label: "接入指引",
        description: "查看本地、OSS、又拍云与审核配置说明",
        icon: ScrollText,
      },
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
