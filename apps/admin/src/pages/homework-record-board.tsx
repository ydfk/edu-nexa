import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ImageIcon,
  Layers3,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  AttachmentPreviewList,
} from "@/components/domain/attachment-preview";
import {
  FileUpload,
  createFileItemsFromUrls,
  type FileItem,
} from "@/components/domain/file-upload";
import { HomeworkStatusBadge } from "@/components/domain/homework-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdminSession } from "@/lib/auth/session";
import {
  deleteHomeworkRecord,
  fetchDailyHomework,
  fetchHomeworkRecords,
  fetchServiceDays,
  fetchStudents,
  saveHomeworkRecord,
  type DailyHomeworkItem,
  type HomeworkRecordItem,
  type ServiceDayItem,
  type StudentItem,
} from "@/lib/server-data";
import { getHomeworkContentLines } from "./daily-homework-helpers";
import {
  buildHomeworkRecordKey,
  findHomeworkRecord,
  getAssignmentsForStudent,
  homeworkStatusMap,
  homeworkStatusOptions,
} from "./homework-record-helpers";

type RecordDialogProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  student: StudentItem;
  assignment: DailyHomeworkItem;
  record: HomeworkRecordItem | null;
  defaultStatus: string;
  serviceDate: string;
  onSaved: () => void;
};

function HomeworkRecordEditDialog({
  open,
  onOpenChange,
  student,
  assignment,
  record,
  defaultStatus,
  serviceDate,
  onSaved,
}: RecordDialogProps) {
  const session = useAdminSession();
  const [status, setStatus] = useState("pending");
  const [remark, setRemark] = useState("");
  const [images, setImages] = useState<FileItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (record) {
      setStatus(record.status);
      setRemark(record.remark);
      setImages(createFileItemsFromUrls(record.imageUrls));
      return;
    }

    setStatus(defaultStatus || "pending");
    setRemark("");
    setImages([]);
  }, [defaultStatus, open, record]);

  async function handleSave() {
    setSaving(true);
    try {
      await saveHomeworkRecord({
        assignmentId: assignment.id,
        className: student.className,
        id: record?.id || undefined,
        imageUrls: images.map((item) => item.url),
        recordedBy: session.user?.displayName || "",
        recordedById: session.user?.id || "",
        remark: remark.trim(),
        schoolName: student.schoolName,
        serviceDate,
        status,
        studentId: student.id,
        studentName: student.name,
        subject: assignment.subject,
        subjectSummary: getHomeworkContentLines(assignment).join("\n"),
      });
      toast.success("已保存");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {record ? "编辑作业记录" : "记录作业"} - {student.name} / {assignment.subject || "未分类"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline">{assignment.subject || "未分类"}</Badge>
              <span className="text-xs text-muted-foreground">
                {student.schoolName} / {student.grade} / {student.className}
              </span>
            </div>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {getHomeworkContentLines(assignment).map((line, index) => (
                <li key={`${assignment.id}-${index}`}>{line}</li>
              ))}
            </ul>
          </div>

          <div className="grid gap-2">
            <Label required>完成情况</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {homeworkStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>上传附件（图片 / PDF）</Label>
            <FileUpload
              value={images}
              onChange={setImages}
              maxFiles={9}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="homework-board-remark">备注</Label>
            <Textarea
              id="homework-board-remark"
              placeholder="可选填写备注"
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={saving} onClick={handleSave}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type AssignmentCardProps = {
  assignment: DailyHomeworkItem;
  record: HomeworkRecordItem | null;
  canEdit: boolean;
  onRecord: (defaultStatus: string) => void;
  onDelete: () => void;
};

function AssignmentRecordCard({
  assignment,
  record,
  canEdit,
  onRecord,
  onDelete,
}: AssignmentCardProps) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{assignment.subject || "未分类"}</Badge>
            {record ? (
              homeworkStatusMap[record.status] ? (
                <HomeworkStatusBadge
                  status={record.status as "completed" | "partial" | "pending"}
                />
              ) : (
                <Badge variant="secondary">{record.status}</Badge>
              )
            ) : (
              <HomeworkStatusBadge status="unrecorded" />
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {assignment.teacherName ? `教师: ${assignment.teacherName}` : "未记录教师"}
          </div>
        </div>
        {record?.imageUrls.length ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ImageIcon className="size-3.5" />
            {record.imageUrls.length} 个附件
          </div>
        ) : null}
      </div>

      <ul className="list-inside list-disc space-y-1 text-sm">
        {getHomeworkContentLines(assignment).map((line, index) => (
          <li key={`${assignment.id}-${index}`}>{line}</li>
        ))}
      </ul>

      {record?.imageUrls.length ? (
        <AttachmentPreviewList
          className="mt-2"
          compact
          items={createFileItemsFromUrls(record.imageUrls)}
          maxVisible={3}
        />
      ) : null}

      {record?.remark ? (
        <p className="mt-2 text-xs text-muted-foreground">备注: {record.remark}</p>
      ) : null}

      {canEdit ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {!record ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-emerald-200 bg-emerald-50 text-xs text-emerald-700 hover:bg-emerald-100"
                onClick={() => onRecord("completed")}
              >
                <Check className="mr-1 size-3" />
                已完成
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-rose-200 bg-rose-50 text-xs text-rose-700 hover:bg-rose-100"
                onClick={() => onRecord("pending")}
              >
                <X className="mr-1 size-3" />
                未完成
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-amber-200 bg-amber-50 text-xs text-amber-700 hover:bg-amber-100"
                onClick={() => onRecord("partial")}
              >
                <Clock className="mr-1 size-3" />
                部分完成
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onRecord(record.status)}>
                <Pencil className="mr-1 size-3" />
                编辑
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs text-destructive"
                onClick={onDelete}
              >
                删除
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

type StudentCardProps = {
  student: StudentItem;
  assignments: DailyHomeworkItem[];
  recordMap: Record<string, HomeworkRecordItem>;
  canEdit: boolean;
  onRecord: (assignment: DailyHomeworkItem, defaultStatus: string) => void;
  onDelete: (record: HomeworkRecordItem) => void;
};

type StudentSection = {
  key: string;
  students: StudentItem[];
  title: string | null;
};

function StudentHomeworkCard({
  student,
  assignments,
  recordMap,
  canEdit,
  onRecord,
  onDelete,
}: StudentCardProps) {
  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{student.name}</CardTitle>
            <CardDescription className="text-xs">
              {[student.schoolName, student.grade, student.className].filter(Boolean).join(" / ")}
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {assignments.length} 科作业
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {student.guardianName ? <span>家长: {student.guardianName}</span> : null}
          {student.guardianPhone ? <span>{student.guardianPhone}</span> : null}
        </div>

        {assignments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            当天暂无可记录的作业
          </div>
        ) : (
          assignments.map((assignment) => {
            const record = recordMap[buildHomeworkRecordKey(student.id, assignment.subject)] || null;
            return (
              <AssignmentRecordCard
                key={`${student.id}-${assignment.id}`}
                assignment={assignment}
                record={record}
                canEdit={canEdit}
                onRecord={(defaultStatus) => onRecord(assignment, defaultStatus)}
                onDelete={() => record && onDelete(record)}
              />
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export default function HomeworkRecordBoard() {
  const session = useAdminSession();
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [serviceDay, setServiceDay] = useState<ServiceDayItem | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [assignments, setAssignments] = useState<DailyHomeworkItem[]>([]);
  const [records, setRecords] = useState<HomeworkRecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStudent, setDialogStudent] = useState<StudentItem | null>(null);
  const [dialogAssignment, setDialogAssignment] = useState<DailyHomeworkItem | null>(null);
  const [dialogRecord, setDialogRecord] = useState<HomeworkRecordItem | null>(null);
  const [dialogDefaultStatus, setDialogDefaultStatus] = useState("pending");

  const canEdit = !!session.user?.roles.some(
    (role) => role === "admin" || role === "teacher",
  );

  useEffect(() => {
    async function loadStudents() {
      try {
        const items = await fetchStudents(
          session.user?.roles.includes("guardian")
            ? { guardianPhone: session.user?.phone || "" }
            : undefined,
        );
        setStudents(items.filter((item) => !item.status || item.status === "active"));
      } catch {
        setStudents([]);
      }
    }

    void loadStudents();
  }, [session.user?.phone, session.user?.roles]);

  const loadDateData = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const [recordItems, assignmentItems, serviceDays] = await Promise.all([
        fetchHomeworkRecords({ serviceDate: date }),
        fetchDailyHomework({ serviceDate: date }),
        fetchServiceDays({ dateFrom: date, dateTo: date }),
      ]);
      setRecords(recordItems);
      setAssignments(assignmentItems);
      setServiceDay(serviceDays[0] || null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setRecords([]);
      setAssignments([]);
      setServiceDay(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDateData(selectedDate);
  }, [loadDateData, selectedDate]);

  const studentSections = useMemo<StudentSection[]>(() => {
    const schoolNames = Array.from(
      new Set(students.map((student) => student.schoolName?.trim()).filter(Boolean)),
    );
    if (schoolNames.length <= 1) {
      return [
        {
          key: "all",
          students,
          title: null,
        },
      ];
    }

    const sectionMap = new Map<string, StudentItem[]>();
    for (const student of students) {
      const key = student.schoolName?.trim() || "未分配";
      const currentStudents = sectionMap.get(key) || [];
      currentStudents.push(student);
      sectionMap.set(key, currentStudents);
    }

    return Array.from(sectionMap.entries()).map(([key, sectionStudents]) => ({
      key,
      students: sectionStudents,
      title: key,
    }));
  }, [students]);

  const recordMap = useMemo(() => {
    return records.reduce<Record<string, HomeworkRecordItem>>((acc, record) => {
      acc[buildHomeworkRecordKey(record.studentId, record.subject)] = record;
      return acc;
    }, {});
  }, [records]);

  const stats = useMemo(() => {
    const totalAssignments = students.reduce((sum, student) => {
      return sum + getAssignmentsForStudent(student, assignments).length;
    }, 0);
    const completed = records.filter((item) => item.status === "completed").length;
    const partial = records.filter((item) => item.status === "partial").length;
    const pending = Math.max(0, totalAssignments - records.length);

    return { completed, partial, pending, totalAssignments };
  }, [assignments, records, students]);

  function goPrevDay() {
    setSelectedDate((value) => format(subDays(new Date(value), 1), "yyyy-MM-dd"));
  }

  function goNextDay() {
    setSelectedDate((value) => format(addDays(new Date(value), 1), "yyyy-MM-dd"));
  }

  function goToday() {
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
  }

  function openRecordDialog(student: StudentItem, assignment: DailyHomeworkItem, defaultStatus: string) {
    setDialogStudent(student);
    setDialogAssignment(assignment);
    setDialogRecord(findHomeworkRecord(records, student.id, assignment.subject));
    setDialogDefaultStatus(defaultStatus);
    setDialogOpen(true);
  }

  async function handleDelete(record: HomeworkRecordItem) {
    if (!window.confirm(`确定删除 ${record.studentName} 的 ${record.subject || "作业"} 记录？`)) {
      return;
    }

    try {
      await deleteHomeworkRecord(record.id);
      toast.success("已删除");
      void loadDateData(selectedDate);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    }
  }

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");
  const weekDayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekDay = weekDayNames[new Date(selectedDate + "T00:00:00").getDay()];
  const hasHomeworkService = serviceDay?.hasHomeworkService ||
    serviceDay?.hasDaytimeHomeworkService ||
    serviceDay?.hasEveningHomeworkService;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <CalendarDays className="size-4 text-muted-foreground" />
          <Button variant="outline" size="icon" onClick={goPrevDay}>
            <ChevronLeft className="size-4" />
          </Button>
          <Input
            type="date"
            value={selectedDate}
            className="w-auto"
            onChange={(event) => event.target.value && setSelectedDate(event.target.value)}
          />
          <Button variant="outline" size="icon" onClick={goNextDay}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <span className="text-sm font-medium text-muted-foreground">{weekDay}</span>
        {!isToday ? (
          <Button variant="ghost" size="sm" onClick={goToday}>
            回到今天
          </Button>
        ) : null}

        {!loading ? (
          <div className="flex items-center gap-2">
            {hasHomeworkService ? (
              <Badge variant="default" className="bg-green-600">
                当日有作业服务
              </Badge>
            ) : serviceDay ? (
              <Badge variant="secondary">当日无作业服务</Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                <AlertTriangle className="mr-1 size-3" />
                未配置服务日历
              </Badge>
            )}
          </div>
        ) : null}
      </div>

      {!loading && stats.totalAssignments > 0 ? (
        <div className="flex flex-wrap gap-4 text-sm">
          <span>共 <strong>{stats.totalAssignments}</strong> 条待记录作业</span>
          <span className="text-green-600">已完成 <strong>{stats.completed}</strong></span>
          <span className="text-amber-600">部分完成 <strong>{stats.partial}</strong></span>
          <span className="text-rose-600">未完成 <strong>{records.filter((item) => item.status === "pending").length}</strong></span>
          <span className="text-muted-foreground">
            <Layers3 className="mr-0.5 inline size-3" />
            未记录 <strong>{stats.pending}</strong>
          </span>
        </div>
      ) : null}

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          加载中…
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg">暂无学生</p>
            <p className="mt-1 text-sm">请先添加学生信息</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {studentSections.map((section) => (
            <div key={section.key}>
              {section.title ? (
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                  {section.title}
                  <span className="ml-2 font-normal">({section.students.length} 人)</span>
                </h3>
              ) : null}
              <div className="grid gap-3 lg:grid-cols-2">
                {section.students.map((student) => (
                  <StudentHomeworkCard
                    key={student.id}
                    student={student}
                    assignments={getAssignmentsForStudent(student, assignments)}
                    recordMap={recordMap}
                    canEdit={canEdit}
                    onRecord={(assignment, defaultStatus) =>
                      openRecordDialog(student, assignment, defaultStatus)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {dialogStudent && dialogAssignment ? (
        <HomeworkRecordEditDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          student={dialogStudent}
          assignment={dialogAssignment}
          record={dialogRecord}
          defaultStatus={dialogDefaultStatus}
          serviceDate={selectedDate}
          onSaved={() => loadDateData(selectedDate)}
        />
      ) : null}
    </div>
  );
}
