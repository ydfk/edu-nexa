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
import { studentSummaries } from "@/lib/mock-data";

export default function StudentsPage() {
  return (
    <Card className="border-none bg-card/90 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">学生基础台账</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>学生</TableHead>
              <TableHead>校区 / 学校 / 年级</TableHead>
              <TableHead>监护人</TableHead>
              <TableHead>晚餐</TableHead>
              <TableHead>作业</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {studentSummaries.map((student) => (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.name}</TableCell>
                <TableCell>
                  <div>
                    <p>{student.campusName}</p>
                    <p className="text-sm text-muted-foreground">
                      {student.schoolName} · {student.grade}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p>{student.guardianName}</p>
                    <p className="text-sm text-muted-foreground">
                      {student.guardianPhone}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={student.mealStatus} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={student.homeworkStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
