import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import {
  RedirectAuthenticatedUser,
  RequireBackofficeAuth,
  RequireRoles,
} from "@/components/auth/route-guards";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import Layout from "@/components/layout/layout";
import DashboardPage from "@/pages/dashboard";
import DailyHomeworkPage from "@/pages/daily-homework";
import GuardiansPage from "@/pages/guardians";
import SchoolsPage from "@/pages/schools";
import StudentsPage from "@/pages/students";
import MealRecordsPage from "@/pages/meal-records";
import HomeworkRecordsPage from "@/pages/homework-records";
import ServiceCalendarPage from "@/pages/service-calendar";
import StatisticsPage from "@/pages/statistics";
import TeachersPage from "@/pages/teachers";
import LoginPage from "@/pages/login";
import NotFoundPage from "@/pages/errors/not-found";
import ForbiddenPage from "@/pages/errors/forbidden";
import ServerErrorPage from "@/pages/errors/server-error";
import SettingsProfilePage from "@/pages/settings/index";
import SettingsAppearancePage from "@/pages/settings/appearance";
import { PageContent } from "@/components/page-content";
import "./index.css";

const router = createBrowserRouter([
  {
    element: <RequireBackofficeAuth />,
    children: [
      {
        path: "/",
        element: <Layout />,
        children: [
          { index: true, element: <DashboardPage /> },
          {
            path: "statistics",
            element: (
              <RequireRoles allowedRoles={["admin", "teacher"]}>
                <StatisticsPage />
              </RequireRoles>
            ),
          },
          {
            path: "teachers",
            element: (
              <RequireRoles allowedRoles={["admin"]}>
                <TeachersPage />
              </RequireRoles>
            ),
          },
          {
            path: "schools",
            element: (
              <RequireRoles allowedRoles={["admin", "teacher"]}>
                <SchoolsPage />
              </RequireRoles>
            ),
          },
          {
            path: "grades",
            element: (
              <RequireRoles allowedRoles={["admin", "teacher"]}>
                <SchoolsPage />
              </RequireRoles>
            ),
          },
          {
            path: "classes",
            element: (
              <RequireRoles allowedRoles={["admin", "teacher"]}>
                <SchoolsPage />
              </RequireRoles>
            ),
          },
          {
            path: "guardians",
            element: (
              <RequireRoles allowedRoles={["admin", "teacher"]}>
                <GuardiansPage />
              </RequireRoles>
            ),
          },
          {
            path: "students",
            element: (
              <RequireRoles allowedRoles={["admin", "teacher", "guardian"]}>
                <StudentsPage />
              </RequireRoles>
            ),
          },
          { path: "meal-records", element: <MealRecordsPage /> },
          { path: "homework-records", element: <HomeworkRecordsPage /> },
          {
            path: "daily-homework",
            element: (
              <RequireRoles allowedRoles={["admin", "teacher"]}>
                <DailyHomeworkPage />
              </RequireRoles>
            ),
          },
          {
            path: "service-calendar",
            element: (
              <RequireRoles allowedRoles={["admin", "teacher"]}>
                <ServiceCalendarPage />
              </RequireRoles>
            ),
          },
          // 设置页面
          { path: "settings", element: <SettingsProfilePage /> },
          { path: "settings/appearance", element: <SettingsAppearancePage /> },
          // 错误示例页面（已登录状态下查看）
          { path: "errors/not-found", element: <PageContent><NotFoundPage /></PageContent> },
          { path: "errors/forbidden", element: <PageContent><ForbiddenPage /></PageContent> },
          { path: "errors/server-error", element: <PageContent><ServerErrorPage /></PageContent> },
          // 未匹配路由 → 404
          { path: "*", element: <PageContent><NotFoundPage /></PageContent> },
        ],
      },
    ],
  },
  {
    path: "/401",
    element: <ForbiddenPage />,
  },
  {
    element: <RedirectAuthenticatedUser />,
    children: [
      {
        path: "/auth/login",
        element: <LoginPage />,
      },
    ],
  },
  // 未登录情况下的 404
  { path: "*", element: <NotFoundPage /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  </StrictMode>
);
