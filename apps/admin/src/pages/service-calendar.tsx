import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchCampuses,
  fetchServiceDays,
  type CampusItem,
  type ServiceDayItem,
} from "@/lib/server-data";

export default function ServiceCalendarPage() {
  const [campuses, setCampuses] = useState<CampusItem[]>([]);
  const [days, setDays] = useState<ServiceDayItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchCampuses(), fetchServiceDays()])
      .then(([campusItems, dayItems]) => {
        if (cancelled) {
          return;
        }
        setCampuses(campusItems);
        setDays(dayItems);
      })
      .catch(() => {
        if (!cancelled) {
          setCampuses([]);
          setDays([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const campusNameMap = useMemo(() => {
    return campuses.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
  }, [campuses]);

  return (
    <Card className="border-none bg-card/90 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">机构服务日历</CardTitle>
      </CardHeader>
      <CardContent>
        {days.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            当前还没有服务日历配置。
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>校区</TableHead>
                <TableHead>晚辅用餐</TableHead>
                <TableHead>作业辅导</TableHead>
                <TableHead>备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.serviceDate}</TableCell>
                  <TableCell>{campusNameMap[item.campusId] || item.campusId}</TableCell>
                  <TableCell>{renderServiceState(item.hasMealService)}</TableCell>
                  <TableCell>{renderServiceState(item.hasHomeworkService)}</TableCell>
                  <TableCell>{item.remark || "暂无备注"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function renderServiceState(enabled: boolean) {
  if (enabled) {
    return (
      <span className="inline-flex items-center gap-2 text-blue-600">
        <CheckCircle2 className="size-4" />
        开放
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      <XCircle className="size-4" />
      关闭
    </span>
  );
}
