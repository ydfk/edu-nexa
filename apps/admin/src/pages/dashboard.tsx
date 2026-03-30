import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/domain/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  fetchCampuses,
  fetchHomeworkRecords,
  fetchMealRecords,
  fetchOverview,
  fetchStudents,
  type CampusItem,
  type HomeworkRecordItem,
  type MealRecordItem,
  type OverviewItem,
  type StudentItem,
} from "@/lib/server-data";

export default function DashboardPage() {
  const [campuses, setCampuses] = useState<CampusItem[]>([]);
  const [homeworkRecords, setHomeworkRecords] = useState<HomeworkRecordItem[]>([]);
  const [mealRecords, setMealRecords] = useState<MealRecordItem[]>([]);
  const [overview, setOverview] = useState<OverviewItem | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetchOverview(),
      fetchCampuses(),
      fetchStudents(),
      fetchMealRecords(),
      fetchHomeworkRecords(),
    ])
      .then(([overviewData, campusItems, studentItems, mealItems, homeworkItems]) => {
        if (cancelled) {
          return;
        }
        setOverview(overviewData);
        setCampuses(campusItems);
        setStudents(studentItems);
        setMealRecords(mealItems);
        setHomeworkRecords(homeworkItems);
      })
      .catch(() => {
        if (!cancelled) {
          setOverview(null);
          setCampuses([]);
          setStudents([]);
          setMealRecords([]);
          setHomeworkRecords([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const campusProgress = useMemo(() => {
    const studentCountMap = students.reduce<Record<string, number>>((acc, item) => {
      acc[item.campusId] = (acc[item.campusId] || 0) + 1;
      return acc;
    }, {});

    return campuses.map((campus) => {
      const campusStudentCount = studentCountMap[campus.id] || 0;
      const campusMealCount = mealRecords.filter(
        (item) => item.campusId === campus.id && item.status === "completed"
      ).length;
      const campusHomeworkCount = homeworkRecords.filter((item) => {
        return item.campusId === campus.id && ["completed", "partial"].includes(item.status);
      }).length;

      return {
        homeworkPercent:
          campusStudentCount > 0
            ? Math.round((campusHomeworkCount / campusStudentCount) * 100)
            : 0,
        mealPercent:
          campusStudentCount > 0 ? Math.round((campusMealCount / campusStudentCount) * 100) : 0,
        name: campus.name,
      };
    });
  }, [campuses, homeworkRecords, mealRecords, students]);

  const latestHomeworkRecords = homeworkRecords.slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="border-none bg-[linear-gradient(135deg,_rgba(37,99,235,0.96),_rgba(22,59,140,0.98))] text-white shadow-xl shadow-blue-950/20">
          <CardHeader className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-white/70">
              今日运营窗口
            </p>
            <CardTitle className="max-w-2xl text-3xl leading-tight">
              现在页面只展示真实数据，没有任何模拟记录或预填统计。
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/70">当前重点</p>
              <p className="mt-2 text-xl font-semibold">先补齐校区、学生、服务日历基础数据</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/70">录入顺序</p>
              <p className="mt-2 text-xl font-semibold">校区 → 学生 → 每日作业 → 用餐/作业反馈</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/70">当前日期</p>
              <p className="mt-2 text-xl font-semibold">{overview?.date || "未获取"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-card/90 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">运营提醒</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(overview?.alerts || []).length > 0 ? (
              overview?.alerts.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-2xl border p-4"
                >
                  {item.level === "warning" ? (
                    <AlertCircle className="mt-0.5 size-5 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 size-5 text-blue-600" />
                  )}
                  <div className="space-y-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
                当前没有提醒信息。
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(overview?.metrics || []).map((metric) => (
          <Card key={metric.key} className="border-none bg-card/90 shadow-md">
            <CardContent className="space-y-2 p-5">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="text-3xl font-semibold tracking-tight">{metric.value}</p>
              <p className="text-sm text-muted-foreground">来自当前真实库统计</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="border-none bg-card/90 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">校区进度看板</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {campusProgress.length > 0 ? (
              campusProgress.map((item) => (
                <div key={item.name} className="space-y-3 rounded-2xl border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        用餐与作业登记进度
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>晚餐</span>
                      <span>{item.mealPercent}%</span>
                    </div>
                    <Progress value={item.mealPercent} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>作业</span>
                      <span>{item.homeworkPercent}%</span>
                    </div>
                    <Progress value={item.homeworkPercent} />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
                当前还没有足够的真实数据生成校区进度。
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none bg-card/90 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">最近更新</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestHomeworkRecords.length > 0 ? (
              latestHomeworkRecords.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-dashed p-4 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{item.studentName}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.campusName || "未匹配校区"} · {item.subjectSummary || "未填写科目"}
                  </p>
                  <p className="mt-2 text-sm">{item.remark || "暂无反馈"}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border p-4 text-sm text-muted-foreground">
                当前还没有最近作业更新。
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
