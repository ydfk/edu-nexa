import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

test("shows product navigation entries", () => {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </MemoryRouter>
  );

  expect(screen.getByText("工作台")).toBeInTheDocument();
  expect(screen.getByText("用餐登记")).toBeInTheDocument();
  expect(screen.getByText("每日作业")).toBeInTheDocument();
  expect(screen.getByText("首页配置")).toBeInTheDocument();
  expect(screen.getByText("接入指引")).toBeInTheDocument();
  expect(screen.getByText("基础设置")).toBeInTheDocument();
});
