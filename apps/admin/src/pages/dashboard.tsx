import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CreditCard,
  GraduationCap,
  School,
  Utensils,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { PageContent } from "@/components/page-content";
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

type MetricCard = {
  description: string;
  icon: typeof School;
  label: string;
  value: number | string;
};

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
          isGuardian ? Promise.resolve<PaymentRecordItem[]>([]) : fetchPaymentRecords(),
        ]);

        if (cancelled) {
          return;
        }

        const visibleStudentIds = new Set(studentItems.map((item) => item.id));
        setStudents(studentItems);
        setSchools(schoolItems);
        setMealRecords(filterVisibleRecords(mealItems, visibleStudentIds, isGuardian));
        setHomeworkRecords(filterVisibleRecords(homeworkItems, visibleStudentIds, isGuardian));
        setPaymentRecords(paymentItems);
      } catch {
        if (cancelled) {
          return;
        }

        setStudents([]);
        setSchools([]);
        setMealRecords([]);
        setHomeworkRecords([]);
        setPaymentRecords([]);
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
    () => mealRecords.filter((item) => item.serviceDate === today && item.status === "completed").length,
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
  const recentMeals = mealRecords.slice(0, 5);
  const recentHomework = homeworkRecords.slice(0, 5);

  const metricCards: MetricCard[] = isGuardian
    ? [
        {
          label: "关联学生",
          value: students.length,
          icon: GraduationCap,
          description: "已关联的学生数量",
        },
        {
          label: "用餐记录",
          value: mealRecords.length,
          icon: Utensils,
          description: "累计用餐记录",
        },
        {
          label: "作业记录",
          value: homeworkRecords.length,
          icon: BookOpen,
          description: "累计作业记录",
        },
      ]
    : [
        {
          label: "学校数量",
          value: schools.length,
          icon: School,
          description: "在服学校总数",
        },
        {
          label: "学生总数",
          value: students.length,
          icon: GraduationCap,
          description: "在校学生总数",
        },
        {
          label: "今日用餐",
          value: todayMealCount,
          icon: Utensils,
          description: `${today} 已完成`,
        },
        {
          label: "今日作业",
          value: todayHomeworkCount,
          icon: BookOpen,
          description: `${today} 已提交`,
        },
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
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
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
          <RecentMealCard loading={loading} recentMeals={recentMeals} />
          <RecentHomeworkCard loading={loading} recentHomework={recentHomework} />
        </div>
      </div>
    </PageContent>
  );
}

function filterVisibleRecords<T extends { studentId: string }>(
  records: T[],
  visibleStudentIds: Set<string>,
  isGuardian: boolean | undefined,
) {
  if (!isGuardian) {
    return records;
  }

  return records.filter((item) => visibleStudentIds.has(item.studentId));
}

function MetricInline({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function RecentMealCard({
  loading,
  recentMeals,
}: {
  loading: boolean;
  recentMeals: MealRecordItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>最近用餐</CardTitle>
        <CardDescription>最新的 5 条用餐记录</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <LoadingBlocks />
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
          <EmptyState />
        )}
      </CardContent>
    </Card>
  );
}

function RecentHomeworkCard({
  loading,
  recentHomework,
}: {
  loading: boolean;
  recentHomework: HomeworkRecordItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>最近作业</CardTitle>
        <CardDescription>最新的 5 条作业记录</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <LoadingBlocks />
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
          <EmptyState />
        )}
      </CardContent>
    </Card>
  );
}

function LoadingBlocks() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="h-16 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function EmptyState() {
  return <p className="py-4 text-center text-sm text-muted-foreground">暂无记录</p>;
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
