import { Suspense, StrictMode, lazy } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import {
  RedirectAuthenticatedUser,
  RequireBackofficeAuth,
  RequireRoles,
} from "@/components/auth/route-guards";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import UnauthorizedPage from "@/components/error/unauthorized";
import { PageContent } from "@/components/page-content";
import "yet-another-react-lightbox/styles.css";
import "./index.css";

const Layout = lazy(() => import("@/components/layout/layout"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const DailyHomeworkPage = lazy(() => import("@/pages/daily-homework"));
const GuardiansPage = lazy(() => import("@/pages/guardians"));
const SchoolsPage = lazy(() => import("@/pages/schools"));
const StudentsPage = lazy(() => import("@/pages/students"));
const MealRecordsPage = lazy(() => import("@/pages/meal-records"));
const HomeworkRecordsPage = lazy(() => import("@/pages/homework-records"));
const PaymentsPage = lazy(() => import("@/pages/payments"));
const ServiceCalendarPage = lazy(() => import("@/pages/service-calendar"));
const TeachersPage = lazy(() => import("@/pages/teachers"));
const LoginPage = lazy(() => import("@/pages/login"));
const NotFoundPage = lazy(() => import("@/pages/errors/not-found"));
const ForbiddenPage = lazy(() => import("@/pages/errors/forbidden"));
const SettingsProfilePage = lazy(() => import("@/pages/settings/index"));
const SettingsSystemPage = lazy(() => import("@/pages/settings/system"));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      页面加载中...
    </div>
  );
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

const router = createBrowserRouter([
  {
    element: <RequireBackofficeAuth />,
    children: [
      {
        path: "/",
        element: withSuspense(<Layout />),
        children: [
          { index: true, element: withSuspense(<DashboardPage />) },
          {
            path: "teachers",
            element: withSuspense(
              <RequireRoles allowedRoles={["admin"]}>
                <TeachersPage />
              </RequireRoles>
            ),
          },
          {
            path: "schools",
            element: withSuspense(
              <RequireRoles allowedRoles={["admin", "teacher"]}>
                <SchoolsPage />
              </RequireRoles>
            ),
          },
          {
            path: "grades",
            element: withSuspense(
              <RequireRoles allowedRoles={["admin", "teacher"]}>
                <SchoolsPage />
              </RequireRoles>
            ),
          },
          {
            path: "classes",
            element: withSuspense(
              <RequireRoles allowedRoles={["admin", "teacher"]}>
                <SchoolsPage />
              </RequireRoles>
            ),
          },
          {
            path: "guardians",
            element: withSuspense(
              <RequireRoles allowedRoles={["admin", "teacher"]}>
                <GuardiansPage />
              </RequireRoles>
            ),
          },
          {
            path: "students",
            element: withSuspense(
              <RequireRoles allowedRoles={["admin", "teacher", "guardian"]}>
                <StudentsPage />
              </RequireRoles>
            ),
          },
          { path: "meal-records", element: withSuspense(<MealRecordsPage />) },
          { path: "homework-records", element: withSuspense(<HomeworkRecordsPage />) },
          {
            path: "payments",
            element: withSuspense(
              <RequireRoles allowedRoles={["admin", "teacher"]}>
                <PaymentsPage />
              </RequireRoles>
            ),
          },
          {
            path: "daily-homework",
            element: withSuspense(
              <RequireRoles allowedRoles={["admin", "teacher"]}>
                <DailyHomeworkPage />
              </RequireRoles>
            ),
          },
          {
            path: "service-calendar",
            element: withSuspense(
              <RequireRoles allowedRoles={["admin", "teacher"]}>
                <ServiceCalendarPage />
              </RequireRoles>
            ),
          },
          // 设置页面
          { path: "settings", element: withSuspense(<SettingsProfilePage />) },
          {
            path: "settings/system",
            element: withSuspense(
              <RequireRoles allowedRoles={["admin"]}>
                <SettingsSystemPage />
              </RequireRoles>
            ),
          },
          // 未匹配路由 → 404
          {
            path: "*",
            element: withSuspense(
              <PageContent>
                <NotFoundPage />
              </PageContent>,
            ),
          },
        ],
      },
    ],
  },
  {
    path: "/401",
    element: <UnauthorizedPage />,
  },
  {
    path: "/403",
    element: withSuspense(<ForbiddenPage />),
  },
  {
    element: <RedirectAuthenticatedUser />,
    children: [
      {
        path: "/auth/login",
        element: withSuspense(<LoginPage />),
      },
    ],
  },
  // 未登录情况下的 404
  { path: "*", element: withSuspense(<NotFoundPage />) },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  </StrictMode>
);
