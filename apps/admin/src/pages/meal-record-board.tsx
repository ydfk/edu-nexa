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
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  FileUpload,
  type FileItem,
} from "@/components/domain/file-upload";
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
  deleteMealRecord,
  fetchMealRecords,
  fetchServiceDays,
  fetchStudents,
  saveMealRecord,
  type MealRecordItem,
  type ServiceDayItem,
  type StudentItem,
} from "@/lib/server-data";

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const statusOptions = [
  { label: "已用餐", value: "completed", color: "text-green-600" },
  { label: "未用餐", value: "absent", color: "text-destructive" },
] as const;

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "待处理", variant: "secondary" },
  completed: { label: "已用餐", variant: "default" },
  absent: { label: "未用餐", variant: "destructive" },
};

// ---------------------------------------------------------------------------
// 学生卡片上的用餐记录编辑弹窗
// ---------------------------------------------------------------------------

type RecordDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student: StudentItem;
  record: MealRecordItem | null;
  defaultStatus: string;
  serviceDate: string;
  onSaved: () => void;
};

function RecordEditDialog({ open, onOpenChange, student, record, defaultStatus, serviceDate, onSaved }: RecordDialogProps) {
  const session = useAdminSession();
  const [status, setStatus] = useState("pending");
  const [remark, setRemark] = useState("");
  const [images, setImages] = useState<FileItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (record) {
        setStatus(record.status);
        setRemark(record.remark);
        setImages(record.imageUrls?.length
          ? record.imageUrls.map((url) => ({ name: url.split("/").pop() || "图片", type: "image", url }))
          : []);
      } else {
        setStatus(defaultStatus || "completed");
        setRemark("");
        setImages([]);
      }
    }
  }, [open, record, defaultStatus]);

  async function handleSave() {
    setSaving(true);
    try {
      await saveMealRecord({
        id: record?.id || undefined,
        imageUrls: images.map((img) => img.url),
        recordedBy: session.user?.displayName || "",
        recordedById: session.user?.id || "",
        remark: remark.trim(),
        serviceDate,
        status,
        studentId: student.id,
        studentName: student.name,
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {record ? "编辑用餐记录" : "记录用餐"} — {student.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label required>状态</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>上传照片</Label>
            <FileUpload
              value={images}
              onChange={setImages}
              accept="image/*"
              maxFiles={9}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="meal-board-remark">备注</Label>
            <Textarea
              id="meal-board-remark"
              placeholder="可选填写备注"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
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

// ---------------------------------------------------------------------------
// 学生卡片
// ---------------------------------------------------------------------------

type StudentCardProps = {
  student: StudentItem;
  record: MealRecordItem | null;
  onRecord: (defaultStatus: string) => void;
  onDelete: () => void;
  canEdit: boolean;
};

function StudentMealCard({ student, record, onRecord, onDelete, canEdit }: StudentCardProps) {
  const isPaid = student.serviceSummary?.paymentStatus === "paid";

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{student.name}</CardTitle>
            <CardDescription className="text-xs">
              {[student.schoolName, student.grade, student.className]
                .filter(Boolean)
                .join(" / ")}
            </CardDescription>
          </div>
          {record && (
            <Badge variant={statusMap[record.status]?.variant ?? "secondary"}>
              {statusMap[record.status]?.label ?? record.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* 家长 & 缴费信息 */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {student.guardianName && (
            <span>家长: {student.guardianName}</span>
          )}
          <span className={isPaid ? "text-green-600" : "text-amber-600"}>
            {isPaid ? "已缴费" : "未缴费"}
          </span>
        </div>

        {/* 已记录的备注与图片 */}
        {record?.remark && (
          <p className="text-xs text-muted-foreground">备注: {record.remark}</p>
        )}
        {record?.imageUrls && record.imageUrls.length > 0 && (
          <div className="flex gap-1">
            <ImageIcon className="size-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{record.imageUrls.length} 张照片</span>
          </div>
        )}

        {/* 操作按钮 */}
        {canEdit && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {!record ? (
              <>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onRecord("completed")}>
                  <Check className="mr-1 size-3" />
                  已用餐
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onRecord("absent")}>
                  <X className="mr-1 size-3" />
                  未用餐
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onRecord(record.status)}>
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
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 面板视图主体
// ---------------------------------------------------------------------------

export default function MealRecordBoard() {
  const session = useAdminSession();
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [serviceDay, setServiceDay] = useState<ServiceDayItem | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [records, setRecords] = useState<MealRecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 弹窗
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStudent, setDialogStudent] = useState<StudentItem | null>(null);
  const [dialogRecord, setDialogRecord] = useState<MealRecordItem | null>(null);
  const [dialogDefaultStatus, setDialogDefaultStatus] = useState("completed");

  const canEdit = !!session.user?.roles.some(
    (role) => role === "admin" || role === "teacher",
  );

  // 加载学生
  useEffect(() => {
    async function loadStudents() {
      try {
        const items = await fetchStudents(
          session.user?.roles.includes("guardian")
            ? { guardianPhone: session.user?.phone || "" }
            : undefined,
        );
        setStudents(items.filter((s) => !s.status || s.status === "active"));
      } catch {
        setStudents([]);
      }
    }
    void loadStudents();
  }, [session.user?.phone, session.user?.roles]);

  // 按日期加载用餐记录和服务日历
  const loadDateData = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const [mealItems, serviceDays] = await Promise.all([
        fetchMealRecords({ serviceDate: date }),
        fetchServiceDays({ dateFrom: date, dateTo: date }),
      ]);
      setRecords(mealItems);
      setServiceDay(serviceDays.length > 0 ? serviceDays[0] : null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setRecords([]);
      setServiceDay(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDateData(selectedDate);
  }, [selectedDate, loadDateData]);

  // 学生 → 用餐记录映射
  const recordMap = useMemo(() => {
    const map: Record<string, MealRecordItem> = {};
    for (const r of records) {
      map[r.studentId] = r;
    }
    return map;
  }, [records]);

  // 按学校分组学生
  const groupedStudents = useMemo(() => {
    const groups: Record<string, StudentItem[]> = {};
    for (const s of students) {
      const key = [s.schoolName, s.grade, s.className].filter(Boolean).join(" / ") || "未分配";
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    return groups;
  }, [students]);

  // 统计
  const stats = useMemo(() => {
    const total = students.length;
    const completed = records.filter((r) => r.status === "completed").length;
    const absent = records.filter((r) => r.status === "absent").length;
    return { total, completed, absent, pending: total - records.length };
  }, [students, records]);

  // 导航
  function goPrevDay() {
    setSelectedDate((d) => format(subDays(new Date(d), 1), "yyyy-MM-dd"));
  }
  function goNextDay() {
    setSelectedDate((d) => format(addDays(new Date(d), 1), "yyyy-MM-dd"));
  }
  function goToday() {
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
  }

  async function handleDelete(record: MealRecordItem) {
    if (!window.confirm(`确定删除 ${record.studentName} 的用餐记录？`)) return;
    try {
      await deleteMealRecord(record.id);
      toast.success("已删除");
      void loadDateData(selectedDate);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    }
  }

  function openRecordDialog(student: StudentItem, defaultStatus: string) {
    setDialogStudent(student);
    setDialogRecord(recordMap[student.id] || null);
    setDialogDefaultStatus(defaultStatus);
    setDialogOpen(true);
  }

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");
  const weekDayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekDay = weekDayNames[new Date(selectedDate + "T00:00:00").getDay()];

  const hasMealService = serviceDay?.hasMealService || serviceDay?.hasLunchService || serviceDay?.hasDinnerService;

  return (
    <div className="space-y-4">
      {/* 日期导航 */}
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
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
          />
          <Button variant="outline" size="icon" onClick={goNextDay}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <span className="text-sm font-medium text-muted-foreground">{weekDay}</span>
        {!isToday && (
          <Button variant="ghost" size="sm" onClick={goToday}>
            回到今天
          </Button>
        )}

        {/* 用餐服务状态 */}
        {!loading && (
          <div className="flex items-center gap-2">
            {hasMealService ? (
              <Badge variant="default" className="bg-green-600">
                当日有用餐服务
              </Badge>
            ) : serviceDay ? (
              <Badge variant="secondary">当日无用餐服务</Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                <AlertTriangle className="mr-1 size-3" />
                未配置服务日历
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* 统计信息 */}
      {!loading && students.length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm">
          <span>共 <strong>{stats.total}</strong> 名学生</span>
          <span className="text-green-600">已用餐 <strong>{stats.completed}</strong></span>
          <span className="text-destructive">未用餐 <strong>{stats.absent}</strong></span>
          <span className="text-muted-foreground">
            <Clock className="mr-0.5 inline size-3" />
            未记录 <strong>{stats.pending}</strong>
          </span>
        </div>
      )}

      {/* 学生列表（按班级分组） */}
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
          {Object.entries(groupedStudents).map(([groupName, groupStudents]) => (
            <div key={groupName}>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                {groupName}
                <span className="ml-2 font-normal">({groupStudents.length} 人)</span>
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {groupStudents.map((student) => (
                  <StudentMealCard
                    key={student.id}
                    student={student}
                    record={recordMap[student.id] || null}
                    onRecord={(status) => openRecordDialog(student, status)}
                    onDelete={() => {
                      const r = recordMap[student.id];
                      if (r) handleDelete(r);
                    }}
                    canEdit={canEdit}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑弹窗 */}
      {dialogStudent && (
        <RecordEditDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          student={dialogStudent}
          record={dialogRecord}
          defaultStatus={dialogDefaultStatus}
          serviceDate={selectedDate}
          onSaved={() => loadDateData(selectedDate)}
        />
      )}
    </div>
  );
}
