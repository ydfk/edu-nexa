# Admin Dashboard Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the empty statistics board into the admin dashboard, keep only `工作台`, and replace simulated summary content with real operational metrics including current-month payments.

**Architecture:** Extract dashboard aggregation into a pure helper module so the business rules are test-driven and `dashboard.tsx` stays readable. Then remove the obsolete statistics route and nav entry, add a focused dashboard render test, and refactor the page to load payments plus render the merged overview sections with role-aware behavior.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Recharts, date-fns

---

### Task 1: Add Dashboard Aggregation Helpers

**Files:**
- Create: `apps/admin/src/pages/dashboard-helpers.test.ts`
- Create: `apps/admin/src/pages/dashboard-helpers.ts`
- Test: `apps/admin/src/pages/dashboard-helpers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/pages/dashboard-helpers.test.ts` with:

```ts
import {
  buildSchoolOverviewRows,
  buildSevenDayTrendData,
  calculateMonthlyPaymentAmount,
} from "./dashboard-helpers";
import type {
  HomeworkRecordItem,
  MealRecordItem,
  PaymentRecordItem,
  StudentItem,
} from "@/lib/server-data";

const today = "2026-04-02";

const students: StudentItem[] = [
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
  {
    id: "stu-2",
    name: "李四",
    schoolId: "school-b",
    schoolName: "海淀校区",
    classId: "class-b",
    className: "二班",
    grade: "二年级",
    gradeId: "grade-2",
    guardianId: "guardian-2",
    guardianName: "家长B",
    guardianPhone: "13800000002",
    status: "active",
  },
  {
    id: "stu-3",
    name: "王五",
    schoolId: "school-a",
    schoolName: "朝阳校区",
    classId: "class-c",
    className: "三班",
    grade: "三年级",
    gradeId: "grade-3",
    guardianId: "guardian-3",
    guardianName: "家长C",
    guardianPhone: "13800000003",
    status: "active",
  },
];

const mealRecords: MealRecordItem[] = [
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
  {
    id: "meal-2",
    studentId: "stu-1",
    studentName: "张三",
    serviceDate: "2026-03-30",
    status: "completed",
    imageUrls: [],
    recordedBy: "老师甲",
    recordedById: "teacher-1",
    remark: "",
  },
  {
    id: "meal-3",
    studentId: "stu-2",
    studentName: "李四",
    serviceDate: "2026-04-01",
    status: "completed",
    imageUrls: [],
    recordedBy: "老师乙",
    recordedById: "teacher-2",
    remark: "",
  },
  {
    id: "meal-4",
    studentId: "stu-3",
    studentName: "王五",
    serviceDate: "2026-03-20",
    status: "completed",
    imageUrls: [],
    recordedBy: "老师甲",
    recordedById: "teacher-1",
    remark: "",
  },
  {
    id: "meal-5",
    studentId: "stu-2",
    studentName: "李四",
    serviceDate: "2026-04-02",
    status: "pending",
    imageUrls: [],
    recordedBy: "老师乙",
    recordedById: "teacher-2",
    remark: "",
  },
];

const homeworkRecords: HomeworkRecordItem[] = [
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
  {
    id: "homework-2",
    assignmentId: "assignment-2",
    className: "二班",
    schoolName: "海淀校区",
    serviceDate: "2026-04-01",
    status: "partial",
    studentId: "stu-2",
    studentName: "李四",
    subject: "语文",
    subjectSummary: "朗读",
    imageUrls: [],
    recordedBy: "老师乙",
    recordedById: "teacher-2",
    remark: "",
  },
  {
    id: "homework-3",
    assignmentId: "assignment-3",
    className: "三班",
    schoolName: "朝阳校区",
    serviceDate: "2026-03-29",
    status: "completed",
    studentId: "stu-3",
    studentName: "王五",
    subject: "英语",
    subjectSummary: "听写",
    imageUrls: [],
    recordedBy: "老师甲",
    recordedById: "teacher-1",
    remark: "",
  },
  {
    id: "homework-4",
    assignmentId: "assignment-4",
    className: "一班",
    schoolName: "朝阳校区",
    serviceDate: "2026-03-18",
    status: "completed",
    studentId: "stu-1",
    studentName: "张三",
    subject: "科学",
    subjectSummary: "观察",
    imageUrls: [],
    recordedBy: "老师甲",
    recordedById: "teacher-1",
    remark: "",
  },
];

const paymentRecords: PaymentRecordItem[] = [
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
  {
    id: "payment-2",
    paidAt: "2026-04-02T12:30:00Z",
    paymentAmount: 800,
    paymentType: "cash",
    periodEndDate: "2026-06-30",
    periodStartDate: "2026-04-01",
    refundAmount: 0,
    refundedAt: "",
    refundRemark: "",
    remark: "",
    schoolId: "school-b",
    schoolName: "海淀校区",
    studentId: "stu-2",
    studentName: "李四",
    guardianId: "guardian-2",
    guardianName: "家长B",
    guardianPhone: "13800000002",
    classId: "class-b",
    className: "二班",
    gradeId: "grade-2",
    gradeName: "二年级",
    status: "paid",
  },
  {
    id: "payment-3",
    paidAt: "2026-03-28T12:30:00Z",
    paymentAmount: 666,
    paymentType: "cash",
    periodEndDate: "2026-05-31",
    periodStartDate: "2026-03-01",
    refundAmount: 0,
    refundedAt: "",
    refundRemark: "",
    remark: "",
    schoolId: "school-a",
    schoolName: "朝阳校区",
    studentId: "stu-3",
    studentName: "王五",
    guardianId: "guardian-3",
    guardianName: "家长C",
    guardianPhone: "13800000003",
    classId: "class-c",
    className: "三班",
    gradeId: "grade-3",
    gradeName: "三年级",
    status: "paid",
  },
];

test("calculateMonthlyPaymentAmount 只统计本月 paymentAmount", () => {
  expect(calculateMonthlyPaymentAmount(paymentRecords, today)).toBe(2000);
});

test("buildSevenDayTrendData 输出最近七天并按状态聚合", () => {
  expect(buildSevenDayTrendData(mealRecords, homeworkRecords, today)).toEqual([
    { date: "2026-03-27", label: "3/27", meals: 0, homework: 0 },
    { date: "2026-03-28", label: "3/28", meals: 0, homework: 0 },
    { date: "2026-03-29", label: "3/29", meals: 0, homework: 1 },
    { date: "2026-03-30", label: "3/30", meals: 1, homework: 0 },
    { date: "2026-03-31", label: "3/31", meals: 0, homework: 0 },
    { date: "2026-04-01", label: "4/1", meals: 1, homework: 1 },
    { date: "2026-04-02", label: "4/2", meals: 1, homework: 1 },
  ]);
});

test("buildSchoolOverviewRows 按学校汇总学生数与近七天记录", () => {
  expect(buildSchoolOverviewRows(students, mealRecords, homeworkRecords, today)).toEqual([
    {
      schoolName: "朝阳校区",
      studentCount: 2,
      mealCount: 2,
      homeworkCount: 2,
    },
    {
      schoolName: "海淀校区",
      studentCount: 1,
      mealCount: 1,
      homeworkCount: 1,
    },
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --dir apps/admin test:run -- src/pages/dashboard-helpers.test.ts
```

Expected: FAIL with a module resolution error for `./dashboard-helpers` or missing exported functions.

- [ ] **Step 3: Write minimal implementation**

Create `apps/admin/src/pages/dashboard-helpers.ts` with:

```ts
import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns";
import type {
  HomeworkRecordItem,
  MealRecordItem,
  PaymentRecordItem,
  StudentItem,
} from "@/lib/server-data";

export type DashboardTrendPoint = {
  date: string;
  homework: number;
  label: string;
  meals: number;
};

export type SchoolOverviewRow = {
  homeworkCount: number;
  mealCount: number;
  schoolName: string;
  studentCount: number;
};

export function calculateMonthlyPaymentAmount(
  paymentRecords: PaymentRecordItem[],
  today: string,
) {
  const currentDay = parseISO(today);
  const range = {
    end: endOfMonth(currentDay),
    start: startOfMonth(currentDay),
  };

  return paymentRecords.reduce((total, record) => {
    if (!record.paidAt) {
      return total;
    }

    const paidAt = parseISO(record.paidAt);
    return isWithinInterval(paidAt, range) ? total + record.paymentAmount : total;
  }, 0);
}

export function buildSevenDayTrendData(
  mealRecords: MealRecordItem[],
  homeworkRecords: HomeworkRecordItem[],
  today: string,
): DashboardTrendPoint[] {
  const end = parseISO(today);
  const start = subDays(end, 6);
  const days = eachDayOfInterval({ end, start });
  const trendMap = new Map<string, DashboardTrendPoint>(
    days.map((day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      return [
        dateKey,
        {
          date: dateKey,
          homework: 0,
          label: format(day, "M/d"),
          meals: 0,
        },
      ];
    }),
  );

  for (const item of mealRecords) {
    if (item.status !== "completed") {
      continue;
    }

    const matched = trendMap.get(item.serviceDate);
    if (matched) {
      matched.meals += 1;
    }
  }

  for (const item of homeworkRecords) {
    if (!["completed", "partial"].includes(item.status)) {
      continue;
    }

    const matched = trendMap.get(item.serviceDate);
    if (matched) {
      matched.homework += 1;
    }
  }

  return [...trendMap.values()];
}

export function buildSchoolOverviewRows(
  students: StudentItem[],
  mealRecords: MealRecordItem[],
  homeworkRecords: HomeworkRecordItem[],
  today: string,
): SchoolOverviewRow[] {
  const visibleRange = new Set(
    buildSevenDayTrendData(mealRecords, homeworkRecords, today).map((item) => item.date),
  );
  const studentSchoolMap = new Map(
    students.map((student) => [student.id, student.schoolName]),
  );
  const rows = new Map<string, SchoolOverviewRow>();

  for (const student of students) {
    const existing = rows.get(student.schoolName);
    if (existing) {
      existing.studentCount += 1;
      continue;
    }

    rows.set(student.schoolName, {
      homeworkCount: 0,
      mealCount: 0,
      schoolName: student.schoolName,
      studentCount: 1,
    });
  }

  for (const item of mealRecords) {
    if (item.status !== "completed" || !visibleRange.has(item.serviceDate)) {
      continue;
    }

    const schoolName = studentSchoolMap.get(item.studentId);
    if (!schoolName) {
      continue;
    }

    const row = rows.get(schoolName);
    if (row) {
      row.mealCount += 1;
    }
  }

  for (const item of homeworkRecords) {
    if (!["completed", "partial"].includes(item.status) || !visibleRange.has(item.serviceDate)) {
      continue;
    }

    const schoolName = studentSchoolMap.get(item.studentId) || item.schoolName;
    if (!schoolName) {
      continue;
    }

    const row = rows.get(schoolName);
    if (row) {
      row.homeworkCount += 1;
    }
  }

  return [...rows.values()].sort((left, right) => {
    if (right.studentCount !== left.studentCount) {
      return right.studentCount - left.studentCount;
    }

    return left.schoolName.localeCompare(right.schoolName, "zh-CN");
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --dir apps/admin test:run -- src/pages/dashboard-helpers.test.ts
```

Expected: PASS with 3 passing tests for monthly payment, seven-day trends, and school overview aggregation.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/pages/dashboard-helpers.ts apps/admin/src/pages/dashboard-helpers.test.ts
git commit -m "test: cover dashboard aggregation helpers"
```

### Task 2: Remove The Statistics Navigation Entry

**Files:**
- Modify: `apps/admin/src/components/layout/app-sidebar.test.tsx`
- Modify: `apps/admin/src/components/layout/data/sidebar-data.ts`
- Modify: `apps/admin/src/main.tsx`
- Delete: `apps/admin/src/pages/statistics.tsx`
- Test: `apps/admin/src/components/layout/app-sidebar.test.tsx`

- [ ] **Step 1: Write the failing test**

Update `apps/admin/src/components/layout/app-sidebar.test.tsx` to:

```tsx
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
        phone: "13800000001",
        roles: ["admin"],
      },
    }),
  );

  render(
    <MemoryRouter initialEntries={["/"]}>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </MemoryRouter>,
  );

  expect(screen.getByText("工作台")).toBeInTheDocument();
  expect(screen.queryByText("统计看板")).not.toBeInTheDocument();
  expect(screen.getByText("教师管理")).toBeInTheDocument();
  expect(screen.getByText("学校管理")).toBeInTheDocument();
  expect(screen.getByText("家长管理")).toBeInTheDocument();
  expect(screen.getByText("用餐记录")).toBeInTheDocument();
  expect(screen.getByText("每日作业")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --dir apps/admin test:run -- src/components/layout/app-sidebar.test.tsx
```

Expected: FAIL because `统计看板` still renders in the sidebar.

- [ ] **Step 3: Write minimal implementation**

Apply these changes:

`apps/admin/src/components/layout/data/sidebar-data.ts`

```ts
import {
  BookOpenCheck,
  CalendarRange,
  ClipboardList,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  School2,
  Settings,
  Soup,
  UserCog,
  Users,
} from "lucide-react";

// ...

{
  title: "概览",
  items: [{ title: "工作台", url: "/", icon: LayoutDashboard }],
},
```

`apps/admin/src/main.tsx`

```tsx
import DashboardPage from "@/pages/dashboard";
import DailyHomeworkPage from "@/pages/daily-homework";
import GuardiansPage from "@/pages/guardians";
import SchoolsPage from "@/pages/schools";
import StudentsPage from "@/pages/students";
import MealRecordsPage from "@/pages/meal-records";
import HomeworkRecordsPage from "@/pages/homework-records";
import PaymentsPage from "@/pages/payments";
import ServiceCalendarPage from "@/pages/service-calendar";
import TeachersPage from "@/pages/teachers";
import LoginPage from "@/pages/login";
// 删除 StatisticsPage import

// ...

{
  path: "/",
  element: <Layout />,
  children: [
    { index: true, element: <DashboardPage /> },
    // 删除 statistics 路由
    {
      path: "teachers",
      element: (
        <RequireRoles allowedRoles={["admin"]}>
          <TeachersPage />
        </RequireRoles>
      ),
    },
  ],
},
```

Delete the unused file:

```text
apps/admin/src/pages/statistics.tsx
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --dir apps/admin test:run -- src/components/layout/app-sidebar.test.tsx
```

Expected: PASS and the sidebar no longer contains `统计看板`.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/components/layout/app-sidebar.test.tsx apps/admin/src/components/layout/data/sidebar-data.ts apps/admin/src/main.tsx
git rm apps/admin/src/pages/statistics.tsx
git commit -m "refactor: remove obsolete statistics entry"
```

### Task 3: Add A Dashboard Render Test

**Files:**
- Create: `apps/admin/src/pages/dashboard.test.tsx`
- Test: `apps/admin/src/pages/dashboard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/pages/dashboard.test.tsx` with:

```tsx
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
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  XAxis: () => null,
}));

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  vi.clearAllMocks();
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --dir apps/admin test:run -- src/pages/dashboard.test.tsx
```

Expected: FAIL because the current dashboard still renders tabs, simulated monthly data, and does not show `本月缴费金额` or `学校概览`.

- [ ] **Step 3: Keep the failing test in the working tree**

Do not commit yet. Carry the failing render test directly into Task 4 so the dashboard implementation can make it pass before the next commit.

### Task 4: Implement The Merged Dashboard Page

**Files:**
- Modify: `apps/admin/src/pages/dashboard.tsx`
- Reuse: `apps/admin/src/pages/dashboard-helpers.ts`
- Test: `apps/admin/src/pages/dashboard.test.tsx`
- Test: `apps/admin/src/pages/dashboard-helpers.test.ts`

- [ ] **Step 1: Write the minimal implementation**

Refactor `apps/admin/src/pages/dashboard.tsx` to:

```tsx
import { useEffect, useMemo, useState } from "react";
import { BookOpen, CreditCard, GraduationCap, School, Utensils } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PageContent } from "@/components/page-content";
import { useAdminSession } from "@/lib/auth/session";
import {
  fetchHomeworkRecords,
  fetchMealRecords,
  fetchPaymentRecords,
  fetchSchools,
  fetchStudents,
  type HomeworkRecordItem,
  type MealRecordItem,
  type PaymentRecordItem,
  type SchoolItem,
  type StudentItem,
} from "@/lib/server-data";
import {
  buildSchoolOverviewRows,
  buildSevenDayTrendData,
  calculateMonthlyPaymentAmount,
} from "./dashboard-helpers";

const chartConfig = {
  meals: { label: "用餐", color: "var(--chart-1)" },
  homework: { label: "作业", color: "var(--chart-2)" },
} satisfies ChartConfig;

const currencyFormatter = new Intl.NumberFormat("zh-CN", {
  currency: "CNY",
  maximumFractionDigits: 0,
  style: "currency",
});

export default function DashboardPage() {
  const session = useAdminSession();
  const [homeworkRecords, setHomeworkRecords] = useState<HomeworkRecordItem[]>([]);
  const [mealRecords, setMealRecords] = useState<MealRecordItem[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecordItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isGuardian = session.user?.roles.includes("guardian");
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const studentItems = await fetchStudents(
          isGuardian ? { guardianPhone: session.user?.phone || "" } : undefined,
        );
        const [schoolItems, mealItems, homeworkItems, paymentItems] = await Promise.all([
          fetchSchools({ status: "active" }),
          fetchMealRecords(),
          fetchHomeworkRecords(),
          isGuardian ? Promise.resolve([]) : fetchPaymentRecords(),
        ]);

        if (cancelled) {
          return;
        }

        const visibleStudentIds = new Set(studentItems.map((item) => item.id));
        setStudents(studentItems);
        setSchools(schoolItems);
        setMealRecords(
          isGuardian
            ? mealItems.filter((item) => visibleStudentIds.has(item.studentId))
            : mealItems,
        );
        setHomeworkRecords(
          isGuardian
            ? homeworkItems.filter((item) => visibleStudentIds.has(item.studentId))
            : homeworkItems,
        );
        setPaymentRecords(paymentItems);
      } catch {
        if (!cancelled) {
          setStudents([]);
          setSchools([]);
          setMealRecords([]);
          setHomeworkRecords([]);
          setPaymentRecords([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [isGuardian, session.user?.phone]);

  const todayMealCount = useMemo(
    () =>
      mealRecords.filter(
        (item) => item.serviceDate === today && item.status === "completed",
      ).length,
    [mealRecords, today],
  );
  const todayHomeworkCount = useMemo(
    () =>
      homeworkRecords.filter(
        (item) =>
          item.serviceDate === today &&
          ["completed", "partial"].includes(item.status),
      ).length,
    [homeworkRecords, today],
  );
  const monthlyPaymentAmount = useMemo(
    () => calculateMonthlyPaymentAmount(paymentRecords, today),
    [paymentRecords, today],
  );
  const trendData = useMemo(
    () => buildSevenDayTrendData(mealRecords, homeworkRecords, today),
    [mealRecords, homeworkRecords, today],
  );
  const schoolOverview = useMemo(
    () => buildSchoolOverviewRows(students, mealRecords, homeworkRecords, today),
    [students, mealRecords, homeworkRecords, today],
  );
  const recentHomework = homeworkRecords.slice(0, 5);
  const recentMeals = mealRecords.slice(0, 5);

  const metricCards = isGuardian
    ? [
        { label: "关联学生", value: students.length, icon: GraduationCap, description: "已关联的学生数量" },
        { label: "用餐记录", value: mealRecords.length, icon: Utensils, description: "累计用餐记录" },
        { label: "作业记录", value: homeworkRecords.length, icon: BookOpen, description: "累计作业记录" },
      ]
    : [
        { label: "学校数量", value: schools.length, icon: School, description: "在服学校总数" },
        { label: "学生总数", value: students.length, icon: GraduationCap, description: "在校学生总数" },
        { label: "今日用餐", value: todayMealCount, icon: Utensils, description: `${today} 已完成` },
        { label: "今日作业", value: todayHomeworkCount, icon: BookOpen, description: `${today} 已提交` },
        {
          label: "本月缴费金额",
          value: currencyFormatter.format(monthlyPaymentAmount),
          icon: CreditCard,
          description: "当前自然月累计缴费",
        },
      ];

  return (
    <PageContent>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">工作台</h1>
            <p className="text-sm text-muted-foreground">
              欢迎回来，{session.user?.displayName || "管理员"}
            </p>
          </div>
          <Badge variant="outline" className="hidden md:flex">
            {today}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {metricCards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <card.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? <span className="text-muted-foreground">—</span> : card.value}
                </div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {!isGuardian && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>近7天趋势</CardTitle>
                <CardDescription>最近 7 天用餐与作业完成情况</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[240px] w-full">
                  <BarChart data={trendData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} tickMargin={10} axisLine={false} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dashed" labelKey="label" />}
                    />
                    <Bar dataKey="meals" fill="var(--color-meals)" radius={4} />
                    <Bar dataKey="homework" fill="var(--color-homework)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>学校概览</CardTitle>
                <CardDescription>按学校查看近 7 天的基础运营数据</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {schoolOverview.length > 0 ? (
                  schoolOverview.map((item) => (
                    <div
                      key={item.schoolName}
                      className="grid gap-3 rounded-lg border p-4 md:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.schoolName}</p>
                        <p className="text-xs text-muted-foreground">最近 7 天学校汇总</p>
                      </div>
                      <MetricInline label="学生数" value={item.studentCount} />
                      <MetricInline label="用餐完成" value={item.mealCount} />
                      <MetricInline label="作业提交" value={item.homeworkCount} />
                    </div>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">暂无学校数据</p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>最近用餐</CardTitle>
              <CardDescription>最新的 5 条用餐记录</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : recentMeals.length > 0 ? (
                recentMeals.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                        <Utensils className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.studentName}</p>
                        <p className="text-xs text-muted-foreground">{item.serviceDate}</p>
                      </div>
                    </div>
                    <RecordBadge status={item.status} />
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">暂无记录</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>最近作业</CardTitle>
              <CardDescription>最新的 5 条作业记录</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-lg bg-muted" />
                  ))}
                </div>
              ) : recentHomework.length > 0 ? (
                recentHomework.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                        <BookOpen className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{item.studentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {[item.serviceDate, item.schoolName].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <RecordBadge status={item.status} />
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">暂无记录</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContent>
  );
}

function MetricInline({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function RecordBadge({ status }: { status: string }) {
  const labelMap: Record<string, string> = {
    completed: "已完成",
    partial: "部分完成",
    pending: "待处理",
  };

  return (
    <Badge variant={status === "completed" ? "default" : "secondary"}>
      {labelMap[status] || status}
    </Badge>
  );
}
```

- [ ] **Step 2: Run tests to verify the page passes**

Run:

```bash
pnpm --dir apps/admin test:run -- src/pages/dashboard.test.tsx src/pages/dashboard-helpers.test.ts
```

Expected: PASS with the new dashboard render test plus the helper aggregation tests.

- [ ] **Step 3: Run sidebar regression test**

Run:

```bash
pnpm --dir apps/admin test:run -- src/components/layout/app-sidebar.test.tsx
```

Expected: PASS and no `统计看板` entry rendered.

- [ ] **Step 4: Run build verification**

Run:

```bash
pnpm --dir apps/admin build
```

Expected: PASS with a successful TypeScript build and Vite bundle.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/pages/dashboard.tsx apps/admin/src/pages/dashboard.test.tsx
git commit -m "feat: merge statistics into dashboard"
```

## Self-Review

### Spec Coverage

- `只保留工作台`：Task 2 删除菜单、路由和空页面
- `运营总览`：Task 4 渲染核心指标、近 7 天趋势、学校概览、最近记录
- `本月缴费金额`：Task 1 建 helper，Task 4 接入页面
- `guardian 精简视图`：Task 3/4 覆盖并实现角色差异
- `真实数据聚合`：Task 1 helper 测试 + Task 4 页面接入真实接口

### Placeholder Scan

- 没有使用 `TODO`、`TBD` 或“自行处理”类占位描述
- 每个任务都包含明确文件路径、代码片段、运行命令和预期结果

### Type Consistency

- helper 函数名统一为 `calculateMonthlyPaymentAmount`、`buildSevenDayTrendData`、`buildSchoolOverviewRows`
- 页面和测试统一复用相同的 helper 名称与 `PaymentRecordItem` / `MealRecordItem` / `HomeworkRecordItem` / `StudentItem` 类型
