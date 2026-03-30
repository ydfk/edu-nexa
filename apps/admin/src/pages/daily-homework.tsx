import { useEffect, useMemo, useState } from "react";
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
  fetchDailyHomework,
  type CampusItem,
  type DailyHomeworkItem,
} from "@/lib/server-data";

export default function DailyHomeworkPage() {
  const [campuses, setCampuses] = useState<CampusItem[]>([]);
  const [items, setItems] = useState<DailyHomeworkItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchDailyHomework(), fetchCampuses()])
      .then(([nextItems, campusItems]) => {
        if (!cancelled) {
          setCampuses(campusItems);
          setItems(nextItems);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCampuses([]);
          setItems([]);
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
        <CardTitle className="text-lg">每日作业配置</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            当前还没有每日作业配置。
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>校区 / 学校 / 班级</TableHead>
                <TableHead>作业内容</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>教师</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.serviceDate}</TableCell>
                  <TableCell>
                    <div>
                      <p>{campusNameMap[item.campusId] || item.campusId || "未匹配校区"}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.schoolName || "未填写学校"} · {item.className || "未填写班级"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xl">{item.content || "未填写"}</TableCell>
                  <TableCell>{item.remark || "暂无备注"}</TableCell>
                  <TableCell>{item.teacherName || "未记录"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
