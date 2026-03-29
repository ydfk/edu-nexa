import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/domain/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  campusSummaries,
  dashboardMetrics,
  homeworkRecords,
  mealRecords,
} from "@/lib/mock-data";

export default function DashboardPage() {
  const campusProgress = campusSummaries.map((campus) => {
    const campusMealCount = mealRecords.filter(
      (item) => item.campusName === campus.name && item.status === "completed"
    ).length;
    const campusHomeworkCount = homeworkRecords.filter(
      (item) =>
        item.campusName === campus.name &&
        ["completed", "in_progress"].includes(item.status)
    ).length;

    return {
      name: campus.name,
      mealPercent: Math.round((campusMealCount / campus.studentCount) * 100),
      homeworkPercent: Math.round(
        (campusHomeworkCount / campus.studentCount) * 100
      ),
    };
  });

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="border-none bg-[linear-gradient(135deg,_rgba(52,145,109,0.96),_rgba(27,74,61,0.98))] text-white shadow-xl shadow-emerald-950/20">
          <CardHeader className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-white/70">
              今日运营窗口
            </p>
            <CardTitle className="max-w-2xl text-3xl leading-tight">
              先把晚辅用餐和作业回传两条主链路打通，后续再叠加家长通知与统计复盘。
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/70">当前重点</p>
              <p className="mt-2 text-xl font-semibold">到校后 30 分钟内完成用餐登记</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/70">闭环节点</p>
              <p className="mt-2 text-xl font-semibold">20:30 前让监护人可查看作业状态</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-sm text-white/70">当前风险</p>
              <p className="mt-2 text-xl font-semibold">经开校区晚餐登记进度偏慢</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-card/90 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">运营提醒</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/80 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <AlertCircle className="mt-0.5 size-5 text-amber-600" />
              <div className="space-y-1">
                <p className="font-medium">仍有 12 名学生未登记晚餐</p>
                <p className="text-sm text-muted-foreground">
                  优先排查经开校区的到校确认与请假同步。
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
              <div className="space-y-1">
                <p className="font-medium">南湖校区作业记录节奏稳定</p>
                <p className="text-sm text-muted-foreground">
                  可以作为后续批量通知和模板沉淀的试点校区。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map((metric) => (
          <Card key={metric.label} className="border-none bg-card/90 shadow-md">
            <CardContent className="space-y-2 p-5">
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="text-3xl font-semibold tracking-tight">{metric.value}</p>
              <p className="text-sm text-muted-foreground">{metric.note}</p>
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
            {campusProgress.map((item) => (
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
            ))}
          </CardContent>
        </Card>

        <Card className="border-none bg-card/90 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">最近更新</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {homeworkRecords.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-dashed p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{item.studentName}</p>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.campusName} · {item.subjectSummary}
                </p>
                <p className="mt-2 text-sm">{item.remark}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
