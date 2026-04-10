import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

test("shows product navigation entries without statistics board", () => {
  window.localStorage.setItem(
    "edunexa.admin.session.v1",
    JSON.stringify({
      token: "token",
      user: {
        displayName: "管理员",
        id: "1",
        isDemo: false,
        phone: "13800000001",
        roles: ["admin"],
        status: "active",
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
  expect(screen.queryByText("统计看板")).not.toBeInTheDocument();
  expect(screen.getByText("教师管理")).toBeInTheDocument();
  expect(screen.getByText("学校管理")).toBeInTheDocument();
  expect(screen.getByText("家长管理")).toBeInTheDocument();
  expect(screen.getByText("学生管理")).toBeInTheDocument();
  expect(screen.getByText("缴费管理")).toBeInTheDocument();
  expect(screen.getByText("用餐记录")).toBeInTheDocument();
  expect(screen.getByText("每日作业")).toBeInTheDocument();
});
