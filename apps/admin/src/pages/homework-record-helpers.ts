import {
  type DailyHomeworkItem,
  type HomeworkRecordItem,
  type StudentItem,
} from "@/lib/server-data";

export const homeworkStatusOptions = [
  { label: "未完成", value: "pending" },
  { label: "已完成", value: "completed" },
  { label: "部分完成", value: "partial" },
] as const;

export const homeworkStatusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  pending: { label: "未完成", variant: "secondary" },
  completed: { label: "已完成", variant: "default" },
  partial: { label: "部分完成", variant: "outline" },
};

export function getAssignmentsForStudent(
  student: StudentItem | undefined,
  assignments: DailyHomeworkItem[],
) {
  if (!student) {
    return [];
  }

  return assignments.filter((assignment) => {
    if (assignment.classId && student.classId) {
      return assignment.classId === student.classId;
    }

    return assignment.schoolName === student.schoolName && assignment.className === student.className;
  });
}

export function buildHomeworkRecordKey(studentId: string, subject: string) {
  return `${studentId}::${subject}`;
}

export function findHomeworkRecord(
  records: HomeworkRecordItem[],
  studentId: string,
  subject: string,
) {
  return records.find(
    (record) => record.studentId === studentId && record.subject === subject,
  ) || null;
}
