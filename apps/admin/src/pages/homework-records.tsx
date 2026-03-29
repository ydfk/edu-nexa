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
import { homeworkRecords } from "@/lib/mock-data";

export default function HomeworkRecordsPage() {
  return (
    <Card className="border-none bg-card/90 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">作业完成记录</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>学生</TableHead>
              <TableHead>校区</TableHead>
              <TableHead>科目摘要</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>反馈</TableHead>
              <TableHead>记录人</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {homeworkRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.studentName}</TableCell>
                <TableCell>{record.campusName}</TableCell>
                <TableCell>{record.subjectSummary}</TableCell>
                <TableCell>
                  <StatusBadge status={record.status} />
                </TableCell>
                <TableCell>{record.remark}</TableCell>
                <TableCell>{record.recordedBy}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
