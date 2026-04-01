import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  GraduationCap,
  School,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminSession } from "@/lib/auth/session";
import {
  fetchHomeworkRecords,
  fetchMealRecords,
  fetchSchools,
  fetchStudents,
  type HomeworkRecordItem,
  type MealRecordItem,
  type SchoolItem,
  type StudentItem,
} from "@/lib/server-data";
import { PageContent } from "@/components/page-content";

// 近6个月模拟趋势数据（实际项目可改为API）
const monthlyData = [
  { month: "1月", meals: 186, homework: 210 },
  { month: "2月", meals: 205, homework: 198 },
  { month: "3月", meals: 237, homework: 220 },
  { month: "4月", meals: 173, homework: 189 },
  { month: "5月", meals: 209, homework: 245 },
  { month: "6月", meals: 214, homework: 232 },
];

const chartConfig = {
  meals: { label: "用餐", color: "var(--chart-1)" },
  homework: { label: "作业", color: "var(--chart-2)" },
} satisfies ChartConfig;

export default function DashboardPage() {
  const session = useAdminSession();
  const [homeworkRecords, setHomeworkRecords] = useState<HomeworkRecordItem[]>([]);
  const [mealRecords, setMealRecords] = useState<MealRecordItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const studentItems = await fetchStudents(
          session.user?.roles.includes("guardian")
            ? { guardianPhone: session.user?.phone || "" }
            : undefined
        );
        const [schoolItems, mealItems, homeworkItems] = await Promise.all([
          fetchSchools({ status: "active" }),
          fetchMealRecords(),
          fetchHomeworkRecords(),
        ]);

        if (cancelled) return;

        const visibleStudentIDs = new Set(studentItems.map((item) => item.id));
        setStudents(studentItems);
        setSchools(schoolItems);
        setMealRecords(
          session.user?.roles.includes("guardian")
            ? mealItems.filter((item) => visibleStudentIDs.has(item.studentId))
            : mealItems
        );
        setHomeworkRecords(
          session.user?.roles.includes("guardian")
            ? homeworkItems.filter((item) => visibleStudentIDs.has(item.studentId))
            : homeworkItems
        );
      } catch {
        if (cancelled) return;
        setStudents([]);
        setSchools([]);
        setMealRecords([]);
        setHomeworkRecords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();
    return () => { cancelled = true; };
  }, [session.user?.phone, session.user?.roles]);

  const today = new Date().toISOString().slice(0, 10);
  const todayMealCount = useMemo(
    () => mealRecords.filter((item) => item.serviceDate === today && item.status === "completed").length,
    [mealRecords, today]
  );
  const todayHomeworkCount = useMemo(
    () => homeworkRecords.filter((item) => item.serviceDate === today && ["completed", "partial"].includes(item.status)).length,
    [homeworkRecords, today]
  );
  const recentHomework = homeworkRecords.slice(0, 5);
  const recentMeals = mealRecords.slice(0, 5);
  const isGuardian = session.user?.roles.includes("guardian");

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
      ];

  return (
    <PageContent>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">工作台</h1>
            <p className="text-sm text-muted-foreground">欢迎回来，{session.user?.displayName || "管理员"}</p>
          </div>
          <Badge variant="outline" className="hidden md:flex">{today}</Badge>
        </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">总览</TabsTrigger>
          <TabsTrigger value="records">近期记录</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* 指标卡 */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          {/* 趋势图表 */}
          {!isGuardian && (
            <Card>
              <CardHeader>
                <CardTitle>近6个月趋势</CardTitle>
                <CardDescription>用餐与作业记录完成情况</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                  <BarChart data={monthlyData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                    <Bar dataKey="meals" fill="var(--color-meals)" radius={4} />
                    <Bar dataKey="homework" fill="var(--color-homework)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                  数据持续增长 <TrendingUp className="size-4" />
                </div>
                <div className="leading-none text-muted-foreground">
                  展示过去6个月的记录完成趋势
                </div>
              </CardFooter>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>最近用餐</CardTitle>
                <CardDescription>最新的 5 条用餐记录</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
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
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
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
        </TabsContent>
      </Tabs>
      </div>
    </PageContent>
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
