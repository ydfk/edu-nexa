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
import { fetchHomeworkRecords, type HomeworkRecordItem } from "@/lib/server-data";

export default function HomeworkRecordsPage() {
  const [records, setRecords] = useState<HomeworkRecordItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchHomeworkRecords()
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
        <CardTitle className="text-lg">作业完成记录</CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            当前还没有作业反馈记录。
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>学生</TableHead>
                <TableHead>校区 / 学校 / 班级</TableHead>
                <TableHead>科目摘要</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>反馈</TableHead>
                <TableHead>记录人</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.serviceDate}</TableCell>
                  <TableCell className="font-medium">{record.studentName}</TableCell>
                  <TableCell>
                    <div>
                      <p>{record.campusName || "未匹配校区"}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.schoolName || "未填写学校"} · {record.className || "未填写班级"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{record.subjectSummary || "未填写"}</TableCell>
                  <TableCell>
                    <StatusBadge status={record.status} />
                  </TableCell>
                  <TableCell>{record.remark || "暂无反馈"}</TableCell>
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
