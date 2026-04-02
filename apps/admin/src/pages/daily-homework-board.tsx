import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  FileUpload,
  parseAttachments,
  serializeAttachments,
  type FileItem,
} from "@/components/domain/file-upload";
import { SchoolClassCascader } from "@/components/domain/school-class-cascader";
import { PrintPreviewDialog } from "@/pages/daily-homework-print";
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
  fetchRuntimeSettings,
  parseHomeworkSubjects,
} from "@/lib/runtime-settings";
import {
  deleteDailyHomework,
  fetchClasses,
  fetchDailyHomework,
  fetchSchools,
  fetchServiceDays,
  saveDailyHomework,
  type ClassItem,
  type DailyHomeworkItem,
  type SchoolItem,
  type ServiceDayItem,
} from "@/lib/server-data";

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

type ContentItem = { text: string };

type HomeworkFormState = {
  attachments: FileItem[];
  classId: string;
  contentItems: ContentItem[];
  id: string;
  remark: string;
  schoolId: string;
  subject: string;
};

const emptyForm: HomeworkFormState = {
  attachments: [],
  classId: "",
  contentItems: [{ text: "" }],
  id: "",
  remark: "",
  schoolId: "",
  subject: "",
};

function findHomeworkClass(
  item: DailyHomeworkItem,
  schools: SchoolItem[],
  classes: ClassItem[],
) {
  const school =
    schools.find((entry) => entry.id === item.schoolId) ||
    schools.find((entry) => entry.name === item.schoolName);
  const matchedByID = classes.find((entry) => entry.id === item.classId);
  if (matchedByID) {
    return matchedByID;
  }

  const candidates = classes.filter(
    (entry) =>
      entry.name === item.className &&
      (!item.gradeName || entry.gradeName === item.gradeName) &&
      ((school?.id && entry.schoolId === school.id) || entry.schoolName === item.schoolName),
  );
  return candidates.length === 1 ? candidates[0] : undefined;
}

type HomeworkGroup = {
  key: string;
  schoolName: string;
  gradeName: string;
  className: string;
  items: DailyHomeworkItem[];
};

function resolveHomeworkGradeName(item: DailyHomeworkItem, classes: ClassItem[]) {
  if (item.gradeName) {
    return item.gradeName;
  }

  const cls = classes.find((entry) => entry.id === item.classId);
  if (cls) {
    return cls.gradeName;
  }

  const candidates = classes.filter(
    (entry) =>
      entry.schoolName === item.schoolName && entry.name === item.className,
  );
  if (candidates.length !== 1) {
    return "";
  }

  return candidates[0]?.gradeName || "";
}

function groupBySchoolGradeClass(items: DailyHomeworkItem[], classes: ClassItem[]) {
  const groups = new Map<string, HomeworkGroup>();

  for (const item of items) {
    const gradeName = resolveHomeworkGradeName(item, classes);
    const key = [
      item.schoolId || item.schoolName,
      item.classId || item.className,
      gradeName,
    ].join("|");

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        schoolName: item.schoolName,
        gradeName,
        className: item.className,
        items: [],
      });
    }

    groups.get(key)?.items.push(item);
  }

  return Array.from(groups.values());
}

// ---------------------------------------------------------------------------
// 作业表单 Dialog
// ---------------------------------------------------------------------------

function HomeworkFormDialog({
  open,
  onClose,
  onSaved,
  editItem,
  subjects,
  schools,
  classes,
  serviceDate,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editItem: DailyHomeworkItem | null;
  subjects: string[];
  schools: SchoolItem[];
  classes: ClassItem[];
  serviceDate: string;
}) {
  const session = useAdminSession();
  const [form, setForm] = useState<HomeworkFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  // 初始化表单
  useEffect(() => {
    if (!open) return;
    if (editItem) {
      const school =
        schools.find((entry) => entry.id === editItem.schoolId) ||
        schools.find((entry) => entry.name === editItem.schoolName);
      const cls = findHomeworkClass(editItem, schools, classes);
      // 将 content 解析为多条（按换行符分割）
      const lines = editItem.content
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);
      setForm({
        attachments: parseAttachments(editItem.attachments),
        classId: cls?.id || "",
        contentItems: lines.length > 0 ? lines.map((text) => ({ text })) : [{ text: "" }],
        id: editItem.id,
        remark: editItem.remark,
        schoolId: school?.id || "",
        subject: editItem.subject || "",
      });
    } else {
      setForm({
        ...emptyForm,
        subject: "",
      });
    }
  }, [open, editItem, schools, classes, subjects]);

  async function handleSave() {
    const school = schools.find((s) => s.id === form.schoolId);
    const cls = classes.find((c) => c.id === form.classId);
    if (!school || !cls) {
      toast.error("请选择学校、年级和班级");
      return;
    }
    if (!form.subject.trim()) {
      toast.error("请选择科目");
      return;
    }
    const contentLines = form.contentItems
      .map((c) => c.text.trim())
      .filter(Boolean);
    if (contentLines.length === 0) {
      toast.error("请输入至少一条作业内容");
      return;
    }

    setSaving(true);
    try {
      await saveDailyHomework({
        attachments: serializeAttachments(form.attachments),
        classId: cls.id,
        className: cls.name,
        content: contentLines.join("\n"),
        gradeName: cls.gradeName,
        id: form.id || undefined,
        remark: form.remark.trim(),
        schoolId: school.id,
        schoolName: school.name,
        serviceDate,
        subject: form.subject,
        teacherId: session.user?.id || "",
        teacherName: session.user?.displayName || "",
      });
      toast.success("已保存");
      onClose();
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function addContentItem() {
    setForm((prev) => ({
      ...prev,
      contentItems: [...prev.contentItems, { text: "" }],
    }));
  }

  function removeContentItem(index: number) {
    setForm((prev) => ({
      ...prev,
      contentItems: prev.contentItems.filter((_, i) => i !== index),
    }));
  }

  function updateContentItem(index: number, text: string) {
    setForm((prev) => ({
      ...prev,
      contentItems: prev.contentItems.map((item, i) =>
        i === index ? { text } : item,
      ),
    }));
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editItem ? "编辑作业" : "新增作业"} — {serviceDate}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2 md:grid-cols-2">
          {/* 科目选择 */}
          <div className="grid gap-2">
            <Label required>科目</Label>
            <Select
              value={form.subject}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, subject: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择科目" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 学校 / 年级 / 班级 级联选择 */}
          <div className="grid gap-2">
            <Label required>学校 / 年级 / 班级</Label>
            <SchoolClassCascader
              schools={schools}
              classes={classes}
              schoolId={form.schoolId}
              classId={form.classId}
              onSelect={(sid, cid) =>
                setForm((prev) => ({ ...prev, schoolId: sid, classId: cid }))
              }
            />
          </div>

          {/* 作业内容（多条） */}
          <div className="grid gap-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label required>作业内容</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addContentItem}
              >
                <Plus className="mr-1 size-3.5" />
                添加一条
              </Button>
            </div>
            <div className="space-y-2">
              {form.contentItems.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <Textarea
                    placeholder={`作业内容 ${index + 1}`}
                    value={item.text}
                    rows={2}
                    onChange={(e) => updateContentItem(index, e.target.value)}
                  />
                  {form.contentItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-1 shrink-0 text-destructive"
                      onClick={() => removeContentItem(index)}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 附件上传 */}
          <div className="grid gap-2 md:col-span-2">
            <Label>附件（图片/PDF）</Label>
            <FileUpload
              value={form.attachments}
              onChange={(items) =>
                setForm((prev) => ({ ...prev, attachments: items }))
              }
            />
          </div>

          {/* 备注 */}
          <div className="grid gap-2 md:col-span-2">
            <Label>备注</Label>
            <Textarea
              value={form.remark}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, remark: e.target.value }))
              }
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
// 作业卡片
// ---------------------------------------------------------------------------

function HomeworkCard({
  item,
  onEdit,
  onDelete,
  showLocation = true,
}: {
  item: DailyHomeworkItem;
  onEdit: () => void;
  onDelete: () => void;
  showLocation?: boolean;
}) {
  const attachments = useMemo(() => parseAttachments(item.attachments), [item.attachments]);
  const contentLines = item.content.split("\n").filter(Boolean);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {showLocation ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {item.schoolName}
                {item.gradeName && ` / ${item.gradeName}`}
                {` / ${item.className}`}
              </span>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Badge variant="outline">{item.subject || "未分类"}</Badge>
          </div>
          {item.teacherName && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              教师: {item.teacherName}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="icon" variant="ghost" className="size-7" onClick={onEdit}>
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <ul className="list-inside list-disc space-y-1 text-sm">
        {contentLines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>

      {attachments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {attachments.map((file, i) =>
            file.type === "image" ? (
              <a key={i} href={file.url} target="_blank" rel="noreferrer">
                <img
                  src={file.url}
                  alt={file.name}
                  className="size-16 rounded border object-cover"
                />
              </a>
            ) : (
              <a
                key={i}
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded border px-2 py-1 text-xs text-blue-600 hover:bg-muted"
              >
                PDF: {file.name}
              </a>
            ),
          )}
        </div>
      )}

      {item.remark && (
        <p className="mt-2 text-xs text-muted-foreground">备注: {item.remark}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 面板视图主体
// ---------------------------------------------------------------------------

export default function DailyHomeworkBoard() {
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [serviceDay, setServiceDay] = useState<ServiceDayItem | null>(null);
  const [items, setItems] = useState<DailyHomeworkItem[]>([]);
  const [subjects, setSubjects] = useState<string[]>(["语文", "数学", "英语", "其他"]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<DailyHomeworkItem | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  // 加载基础数据（学校、班级、科目配置）
  useEffect(() => {
    async function loadBase() {
      try {
        const [schoolItems, classItems, settings] = await Promise.all([
          fetchSchools({ status: "active" }),
          fetchClasses({ status: "active" }),
          fetchRuntimeSettings(),
        ]);
        setSchools(schoolItems);
        setClasses(classItems);
        setSubjects(parseHomeworkSubjects(settings));
      } catch {
        // 使用默认值
      }
    }
    void loadBase();
  }, []);

  // 按日期加载作业和服务日历
  const loadDateData = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const [homeworkItems, serviceDays] = await Promise.all([
        fetchDailyHomework({ serviceDate: date }),
        fetchServiceDays({ dateFrom: date, dateTo: date }),
      ]);
      setItems(homeworkItems);
      setServiceDay(serviceDays.length > 0 ? serviceDays[0] : null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setItems([]);
      setServiceDay(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDateData(selectedDate);
  }, [selectedDate, loadDateData]);

  const grouped = useMemo(
    () => groupBySchoolGradeClass(items, classes),
    [items, classes],
  );

  // 判断是否有作业服务
  const hasHomeworkService = serviceDay?.hasHomeworkService ||
    serviceDay?.hasDaytimeHomeworkService ||
    serviceDay?.hasEveningHomeworkService;

  function goPrevDay() {
    setSelectedDate((d) => format(subDays(new Date(d), 1), "yyyy-MM-dd"));
  }
  function goNextDay() {
    setSelectedDate((d) => format(addDays(new Date(d), 1), "yyyy-MM-dd"));
  }
  function goToday() {
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
  }

  function handleCreate() {
    setEditItem(null);
    setDialogOpen(true);
  }
  function handleEdit(item: DailyHomeworkItem) {
    setEditItem(item);
    setDialogOpen(true);
  }
  async function handleDelete(item: DailyHomeworkItem) {
    if (!window.confirm("确定删除这条作业？")) return;
    try {
      await deleteDailyHomework(item.id);
      toast.success("已删除");
      void loadDateData(selectedDate);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    }
  }

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");
  const weekDayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekDay = weekDayNames[new Date(selectedDate + "T00:00:00").getDay()];

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

        {/* 服务状态 */}
        {!loading && (
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
        )}

        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            disabled={items.length === 0}
            onClick={() => setPrintOpen(true)}
          >
            打印作业
            <Printer className="ml-1 size-4" />
          </Button>
          <Button onClick={handleCreate}>
            新增作业
            <Plus className="ml-1 size-4" />
          </Button>
        </div>
      </div>

      {/* 作业列表（按学校 / 年级 / 班级分组） */}
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          加载中…
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg">暂无作业</p>
            <p className="mt-1 text-sm">点击「新增作业」来添加今日作业</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {grouped.map((group) => (
            <Card key={group.key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {group.schoolName}
                  {group.gradeName && ` / ${group.gradeName}`}
                  {` / ${group.className}`}
                </CardTitle>
                <CardDescription>
                  {group.items.length} 条作业
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.items.map((item) => (
                  <HomeworkCard
                    key={item.id}
                    item={item}
                    onEdit={() => handleEdit(item)}
                    onDelete={() => handleDelete(item)}
                    showLocation={false}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 表单 Dialog */}
      <HomeworkFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => loadDateData(selectedDate)}
        editItem={editItem}
        subjects={subjects}
        schools={schools}
        classes={classes}
        serviceDate={selectedDate}
      />

      {/* 打印预览 Dialog */}
      <PrintPreviewDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        items={items}
        subjects={subjects}
        classes={classes}
        serviceDate={selectedDate}
      />
    </div>
  );
}
