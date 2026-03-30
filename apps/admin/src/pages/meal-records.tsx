import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/domain/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchMealRecords, type MealRecordItem } from "@/lib/server-data";

export default function MealRecordsPage() {
  const [records, setRecords] = useState<MealRecordItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchMealRecords()
      .then((items) => {
        if (!cancelled) {
          setRecords(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecords([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="border-none bg-card/90 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">晚辅用餐登记</CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            当前还没有用餐记录。
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>学生</TableHead>
                <TableHead>校区</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>记录人</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.serviceDate}</TableCell>
                  <TableCell className="font-medium">{record.studentName}</TableCell>
                  <TableCell>{record.campusName || "未匹配校区"}</TableCell>
                  <TableCell>
                    <StatusBadge status={record.status} />
                  </TableCell>
                  <TableCell>{record.remark || "暂无备注"}</TableCell>
                  <TableCell>{record.recordedBy || "未记录"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
