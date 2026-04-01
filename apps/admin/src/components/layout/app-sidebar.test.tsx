import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

test("shows product navigation entries", () => {
  window.localStorage.setItem(
    "edunexa.admin.session.v1",
    JSON.stringify({
      token: "token",
      user: {
        displayName: "管理员",
        id: "1",
        phone: "13800000001",
        roles: ["admin"],
      },
    })
  );

  render(
    <MemoryRouter initialEntries={["/"]}>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </MemoryRouter>
  );

  expect(screen.getByText("工作台")).toBeInTheDocument();
  expect(screen.getByText("统计看板")).toBeInTheDocument();
  expect(screen.getByText("教师账号")).toBeInTheDocument();
  expect(screen.getByText("学生服务")).toBeInTheDocument();
  expect(screen.getByText("用餐记录")).toBeInTheDocument();
  expect(screen.getByText("每日作业")).toBeInTheDocument();
});
