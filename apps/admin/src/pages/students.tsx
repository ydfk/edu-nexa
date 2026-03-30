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
import { fetchStudents, type StudentItem } from "@/lib/server-data";

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchStudents()
      .then((items) => {
        if (!cancelled) {
          setStudents(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStudents([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="border-none bg-card/90 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">学生基础台账</CardTitle>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            当前还没有学生档案数据。
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>学生</TableHead>
                <TableHead>校区 / 学校 / 班级</TableHead>
                <TableHead>监护人</TableHead>
                <TableHead>服务期 / 缴费</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>
                    <div>
                      <p>{student.campusName || "未匹配校区"}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.schoolName || "未填写学校"} · {student.className || "未填写班级"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>{student.guardianName || "未填写监护人"}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.guardianPhone || "未填写手机号"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p>
                        {formatServicePeriod(
                          student.serviceSummary?.serviceStartDate,
                          student.serviceSummary?.serviceEndDate
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {student.serviceSummary?.paymentStatus === "paid" ? "已缴费" : "待处理"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={student.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function formatServicePeriod(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) {
    return "未设置服务期";
  }

  return `${startDate || "--"} 至 ${endDate || "--"}`;
}
