import { useEffect, useState } from "react";
import { Building2, Clock3, PhoneCall, Users } from "lucide-react";
import { StatusBadge } from "@/components/domain/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCampuses, fetchStudents, type CampusItem } from "@/lib/server-data";

export default function CampusesPage() {
  const [campuses, setCampuses] = useState<CampusItem[]>([]);
  const [studentCountMap, setStudentCountMap] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchCampuses(), fetchStudents()])
      .then(([campusItems, students]) => {
        if (cancelled) {
          return;
        }

        const nextStudentCountMap = students.reduce<Record<string, number>>((acc, item) => {
          acc[item.campusId] = (acc[item.campusId] || 0) + 1;
          return acc;
        }, {});

        setCampuses(campusItems);
        setStudentCountMap(nextStudentCountMap);
      })
      .catch(() => {
        if (!cancelled) {
          setCampuses([]);
          setStudentCountMap({});
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (campuses.length === 0) {
    return (
      <Card className="border-none bg-card/90 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">校区管理</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          当前还没有校区数据，先在后台或接口里创建校区。
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {campuses.map((campus) => (
        <Card key={campus.id} className="border-none bg-card/90 shadow-md">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">{campus.name}</CardTitle>
                <StatusBadge status={campus.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {campus.code} · {campus.address || "未填写地址"}
              </p>
            </div>
            <Building2 className="size-5 text-primary" />
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="size-4" />
                在托规模
              </div>
              <p className="mt-3 text-2xl font-semibold">
                {studentCountMap[campus.id] || 0} 名学生
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                当前以学生真实档案为准
              </p>
            </div>
            <div className="rounded-2xl border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="size-4" />
                服务时段
              </div>
              <p className="mt-3 text-2xl font-semibold">
                {formatServiceWindow(campus.serviceStartAt, campus.serviceEndAt)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">建议同步服务日历安排</p>
            </div>
            <div className="rounded-2xl border p-4 sm:col-span-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PhoneCall className="size-4" />
                联系人
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-lg font-semibold">
                  {campus.contactPerson || "未填写联系人"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {campus.contactPhone || "未填写电话"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatServiceWindow(startAt: string, endAt: string) {
  if (!startAt && !endAt) {
    return "未设置";
  }

  return `${startAt || "--"} - ${endAt || "--"}`;
}
