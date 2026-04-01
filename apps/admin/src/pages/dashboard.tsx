import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export default function DashboardPage() {
  const session = useAdminSession();
  const [homeworkRecords, setHomeworkRecords] = useState<HomeworkRecordItem[]>([]);
  const [mealRecords, setMealRecords] = useState<MealRecordItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
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

        if (cancelled) {
          return;
        }

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
        if (cancelled) {
          return;
        }
        setStudents([]);
        setSchools([]);
        setMealRecords([]);
        setHomeworkRecords([]);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [session.user?.phone, session.user?.roles]);

  const today = new Date().toISOString().slice(0, 10);
  const todayMealCount = useMemo(
    () =>
      mealRecords.filter((item) => item.serviceDate === today && item.status === "completed").length,
    [mealRecords, today]
  );
  const todayHomeworkCount = useMemo(
    () =>
      homeworkRecords.filter((item) => {
        return item.serviceDate === today && ["completed", "partial"].includes(item.status);
      }).length,
    [homeworkRecords, today]
  );
  const recentHomework = homeworkRecords.slice(0, 5);
  const recentMeals = mealRecords.slice(0, 5);
  const isGuardian = session.user?.roles.includes("guardian");

  const metricItems = isGuardian
    ? [
        { label: "关联学生", value: students.length },
        { label: "用餐记录", value: mealRecords.length },
        { label: "作业记录", value: homeworkRecords.length },
      ]
    : [
        { label: "学校", value: schools.length },
        { label: "学生", value: students.length },
        { label: "今日用餐", value: todayMealCount },
        { label: "今日作业", value: todayHomeworkCount },
      ];

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricItems.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-end justify-between p-5">
              <div className="flex flex-col gap-2">
                <CardDescription>{item.label}</CardDescription>
                <CardTitle className="text-4xl font-semibold tracking-tight">{item.value}</CardTitle>
              </div>
              <Badge variant="outline">{today}</Badge>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近用餐</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentMeals.length > 0 ? (
              recentMeals.map((item) => (
                <div key={item.id} className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{item.studentName}</p>
                    <RecordBadge status={item.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.serviceDate}</p>
                  <p className="mt-2 text-sm">{item.remark || "-"}</p>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">暂无记录</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近作业</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentHomework.length > 0 ? (
              recentHomework.map((item) => (
                <div key={item.id} className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{item.studentName}</p>
                    <RecordBadge status={item.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {[item.serviceDate, item.schoolName, item.className].filter(Boolean).join(" / ")}
                  </p>
                  <p className="mt-2 text-sm">{item.subjectSummary || item.remark || "-"}</p>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">暂无记录</div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function RecordBadge({ status }: { status: string }) {
  const labelMap: Record<string, string> = {
    completed: "已完成",
    partial: "完成一部分",
    pending: "待处理",
  };

  return (
    <Badge variant={status === "completed" ? "default" : "secondary"}>
      {labelMap[status] || status}
    </Badge>
  );
}
