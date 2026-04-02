import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "./dashboard";
import {
  fetchHomeworkRecords,
  fetchMealRecords,
  fetchPaymentRecords,
  fetchSchools,
  fetchStudents,
} from "@/lib/server-data";

vi.mock("recharts", () => ({
  Bar: () => null,
  BarChart: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  XAxis: () => null,
}));

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

vi.mock("@/lib/server-data", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server-data")>("@/lib/server-data");
  return {
    ...actual,
    fetchHomeworkRecords: vi.fn(),
    fetchMealRecords: vi.fn(),
    fetchPaymentRecords: vi.fn(),
    fetchSchools: vi.fn(),
    fetchStudents: vi.fn(),
  };
});

const mockedFetchSchools = vi.mocked(fetchSchools);
const mockedFetchStudents = vi.mocked(fetchStudents);
const mockedFetchMealRecords = vi.mocked(fetchMealRecords);
const mockedFetchHomeworkRecords = vi.mocked(fetchHomeworkRecords);
const mockedFetchPaymentRecords = vi.mocked(fetchPaymentRecords);

function setSession(roles: string[], phone = "13800000001") {
  window.localStorage.setItem(
    "edunexa.admin.session.v1",
    JSON.stringify({
      token: "token",
      user: {
        displayName: "测试用户",
        id: "user-1",
        phone,
        roles,
        status: "active",
      },
    }),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-02T08:00:00Z"));
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

test("shows admin overview with monthly payments and school summary", async () => {
  setSession(["admin"]);

  mockedFetchSchools.mockResolvedValue([{ id: "school-a", name: "朝阳校区", status: "active" }]);
  mockedFetchStudents.mockResolvedValue([
    {
      id: "stu-1",
      name: "张三",
      schoolId: "school-a",
      schoolName: "朝阳校区",
      classId: "class-a",
      className: "一班",
      grade: "一年级",
      gradeId: "grade-1",
      guardianId: "guardian-1",
      guardianName: "家长A",
      guardianPhone: "13800000001",
      status: "active",
    },
  ]);
  mockedFetchMealRecords.mockResolvedValue([
    {
      id: "meal-1",
      studentId: "stu-1",
      studentName: "张三",
      serviceDate: "2026-04-02",
      status: "completed",
      imageUrls: [],
      recordedBy: "老师甲",
      recordedById: "teacher-1",
      remark: "",
    },
  ]);
  mockedFetchHomeworkRecords.mockResolvedValue([
    {
      id: "homework-1",
      assignmentId: "assignment-1",
      className: "一班",
      schoolName: "朝阳校区",
      serviceDate: "2026-04-02",
      status: "completed",
      studentId: "stu-1",
      studentName: "张三",
      subject: "数学",
      subjectSummary: "口算",
      imageUrls: [],
      recordedBy: "老师甲",
      recordedById: "teacher-1",
      remark: "",
    },
  ]);
  mockedFetchPaymentRecords.mockResolvedValue([
    {
      id: "payment-1",
      paidAt: "2026-04-01T08:00:00Z",
      paymentAmount: 1200,
      paymentType: "cash",
      periodEndDate: "2026-06-30",
      periodStartDate: "2026-04-01",
      refundAmount: 0,
      refundedAt: "",
      refundRemark: "",
      remark: "",
      schoolId: "school-a",
      schoolName: "朝阳校区",
      studentId: "stu-1",
      studentName: "张三",
      guardianId: "guardian-1",
      guardianName: "家长A",
      guardianPhone: "13800000001",
      classId: "class-a",
      className: "一班",
      gradeId: "grade-1",
      gradeName: "一年级",
      status: "paid",
    },
  ]);

  render(<DashboardPage />);

  await waitFor(() => expect(screen.getByText("本月缴费金额")).toBeInTheDocument());
  expect(screen.getByText("近7天趋势")).toBeInTheDocument();
  expect(screen.getByText("学校概览")).toBeInTheDocument();
  expect(screen.getByText("最近用餐")).toBeInTheDocument();
});

test("keeps guardian dashboard focused on linked students", async () => {
  setSession(["guardian"], "13800000099");

  mockedFetchSchools.mockResolvedValue([{ id: "school-a", name: "朝阳校区", status: "active" }]);
  mockedFetchStudents.mockResolvedValue([
    {
      id: "stu-1",
      name: "张三",
      schoolId: "school-a",
      schoolName: "朝阳校区",
      classId: "class-a",
      className: "一班",
      grade: "一年级",
      gradeId: "grade-1",
      guardianId: "guardian-1",
      guardianName: "家长A",
      guardianPhone: "13800000099",
      status: "active",
    },
  ]);
  mockedFetchMealRecords.mockResolvedValue([]);
  mockedFetchHomeworkRecords.mockResolvedValue([]);
  mockedFetchPaymentRecords.mockResolvedValue([]);

  render(<DashboardPage />);

  await waitFor(() => expect(screen.getByText("关联学生")).toBeInTheDocument());
  expect(screen.queryByText("本月缴费金额")).not.toBeInTheDocument();
  expect(screen.queryByText("学校概览")).not.toBeInTheDocument();
});
