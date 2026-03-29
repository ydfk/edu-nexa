import { Building2, Clock3, PhoneCall, Users } from "lucide-react";
import { StatusBadge } from "@/components/domain/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { campusSummaries } from "@/lib/mock-data";

export default function CampusesPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {campusSummaries.map((campus) => (
        <Card key={campus.id} className="border-none bg-card/90 shadow-md">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl">{campus.name}</CardTitle>
                <StatusBadge status={campus.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {campus.code} · {campus.address}
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
                {campus.studentCount} 名学生
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                当前排班教师 {campus.staffCount} 人
              </p>
            </div>
            <div className="rounded-2xl border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock3 className="size-4" />
                服务时段
              </div>
              <p className="mt-3 text-2xl font-semibold">{campus.serviceWindow}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                建议 18:00 前完成用餐确认
              </p>
            </div>
            <div className="rounded-2xl border p-4 sm:col-span-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PhoneCall className="size-4" />
                联系人
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-lg font-semibold">{campus.contactPerson}</p>
                <p className="text-sm text-muted-foreground">
                  {campus.contactPhone}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
