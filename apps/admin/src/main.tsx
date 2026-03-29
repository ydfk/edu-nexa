import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { RedirectAuthenticatedUser, RequireAdminAuth } from "@/components/auth/route-guards";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import Unauthorized from "@/components/error/unauthorized";
import Layout from "@/components/layout/layout";
import DashboardPage from "@/pages/dashboard";
import CampusesPage from "@/pages/campuses";
import StudentsPage from "@/pages/students";
import MealRecordsPage from "@/pages/meal-records";
import HomeworkRecordsPage from "@/pages/homework-records";
import GuardiansPage from "@/pages/guardians";
import SettingsPage from "@/pages/settings";
import LoginPage from "@/pages/login";
import "./index.css";

const router = createBrowserRouter([
  {
    element: <RequireAdminAuth />,
    children: [
      {
        path: "/",
        element: <Layout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "campuses", element: <CampusesPage /> },
          { path: "students", element: <StudentsPage /> },
          { path: "meal-records", element: <MealRecordsPage /> },
          { path: "homework-records", element: <HomeworkRecordsPage /> },
          { path: "guardians", element: <GuardiansPage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    path: "/401",
    element: <Unauthorized />,
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
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster />
    </ThemeProvider>
  </StrictMode>
);
