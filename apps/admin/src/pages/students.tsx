import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CircleCheck, CirclePause, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { NameReminderAlert } from "@/components/domain/name-reminder-alert";
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from "@/components/data-table";
import { PageContent } from "@/components/page-content";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import useDialogState from "@/hooks/use-dialog-state";
import { findSimilarNames, hasExactName } from "@/lib/name-check";
import {
  getDefaultLoginPassword,
  getDefaultLoginPasswordHint,
} from "@/lib/password-rules";
import {
  emptyRelationshipValue,
  parentRelationshipOptions,
} from "@/lib/parent-relationships";
import {
  deleteStudent,
  fetchClasses,
  fetchGrades,
  fetchGuardianProfiles,
  fetchSchools,
  fetchStudents,
  fetchStudentServices,
  saveClass,
  saveGrade,
  saveGuardianProfile,
  saveSchool,
  saveStudent,
  saveStudentService,
  type ClassItem,
  type GradeItem,
  type GuardianProfileItem,
  type SchoolItem,
  type StudentItem,
  type StudentServiceItem,
} from "@/lib/server-data";

// ---------------------------------------------------------------------------
// 常量与类型
// ---------------------------------------------------------------------------

type DialogType =
  | "create"
  | "edit"
  | "quick-school"
  | "quick-grade"
  | "quick-class"
  | "quick-guardian";

const statusOptions = [
  { label: "启用", value: "active", icon: CircleCheck },
  { label: "暂停", value: "paused", icon: CirclePause },
] as const;

const statusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" }
> = {
  active: { label: "启用", variant: "default" },
  paused: { label: "暂停", variant: "secondary" },
};

const paymentStatusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  paid: { label: "已缴费", variant: "default" },
  unpaid: { label: "待缴费", variant: "destructive" },
  paused: { label: "已暂停", variant: "secondary" },
};

const initialStudentForm = {
  classId: "",
  gradeId: "",
  guardianId: "",
  id: "",
  name: "",
  paidAt: "",
  paymentAmount: "0",
  paymentStatus: "unpaid",
  remark: "",
  schoolId: "",
  serviceEndDate: "",
  servicePlanId: "",
  serviceStartDate: "",
  status: "active",
};

const initialSchoolForm = { name: "", status: "active" };
const initialGradeForm = { name: "", sort: "0", status: "active" };
const initialClassForm = {
  gradeId: "",
  name: "",
  schoolId: "",
  status: "active",
};
const initialGuardianForm = {
  name: "",
  phone: "",
  relationship: "",
  remark: "",
  status: "active",
};

// ---------------------------------------------------------------------------
// 上下文
// ---------------------------------------------------------------------------

type StudentsContextValue = {
  open: DialogType | null;
  setOpen: (value: DialogType | null) => void;
  currentItem: StudentItem | null;
  setCurrentItem: (item: StudentItem | null) => void;
  reloadData: () => Promise<void>;
  schools: SchoolItem[];
  grades: GradeItem[];
  classes: ClassItem[];
  guardians: GuardianProfileItem[];
  servicePlanMap: Record<string, StudentServiceItem>;
};

const StudentsContext = createContext<StudentsContextValue | null>(null);

function useStudents() {
  const ctx = useContext(StudentsContext);
  if (!ctx)
    throw new Error("useStudents must be used within StudentsProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function formatRange(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return "-";
  return `${startDate || "--"} 至 ${endDate || "--"}`;
}

function SelectWithAction({
  children,
  onCreate,
}: {
  children: ReactNode;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-2">
      {children}
      <Button
        className="w-full justify-start"
        size="sm"
        variant="outline"
        onClick={onCreate}
      >
        <Plus className="mr-2 size-4" />
        新增
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 列定义
// ---------------------------------------------------------------------------

function createColumns(
  servicePlanMap: Record<string, StudentServiceItem>,
): ColumnDef<StudentItem>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="学生" />
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      id: "schoolGradeClass",
      header: "学校 / 年级 / 班级",
      cell: ({ row }) =>
        [row.original.schoolName, row.original.grade, row.original.className]
          .filter(Boolean)
          .join(" / ") || "-",
      enableSorting: false,
    },
    {
      id: "guardian",
      header: "家长",
      cell: ({ row }) => (
        <div>
          <p>{row.original.guardianName || "-"}</p>
          <p className="text-sm text-muted-foreground">
            {row.original.guardianPhone || "-"}
          </p>
        </div>
      ),
      enableSorting: false,
    },
    {
      id: "servicePeriod",
      header: "服务周期",
      cell: ({ row }) => {
        const plan = servicePlanMap[row.original.id];
        return formatRange(
          plan?.serviceStartDate ||
            row.original.serviceSummary?.serviceStartDate,
          plan?.serviceEndDate || row.original.serviceSummary?.serviceEndDate,
        );
      },
      enableSorting: false,
    },
    {
      id: "payment",
      header: "缴费",
      cell: ({ row }) => {
        const plan = servicePlanMap[row.original.id];
        const ps =
          plan?.paymentStatus ||
          row.original.serviceSummary?.paymentStatus ||
          "unpaid";
        const info = paymentStatusMap[ps] ?? {
          label: ps,
          variant: "secondary" as const,
        };
        return (
          <div className="space-y-1">
            <p>
              ¥{" "}
              {plan?.paymentAmount ||
                row.original.serviceSummary?.paymentAmount ||
                0}
            </p>
            <Badge variant={info.variant}>{info.label}</Badge>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="状态" />
      ),
      cell: ({ row }) => {
        const status = row.getValue<string>("status");
        const info = statusMap[status] ?? {
          label: status,
          variant: "secondary" as const,
        };
        return <Badge variant={info.variant}>{info.label}</Badge>;
      },
      filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
    },
    {
      id: "actions",
      cell: function ActionsCell({ row }) {
        const { reloadData, setOpen, setCurrentItem } = useStudents();
        return (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCurrentItem(row.original);
                setOpen("edit");
              }}
            >
              <Pencil className="mr-2 size-4" />
              编辑
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (!window.confirm(`确定删除学生「${row.original.name}」？`)) return;
                try {
                  await deleteStudent(row.original.id);
                  toast.success("学生已删除");
                  await reloadData();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "删除失败");
                }
              }}
            >
              <Trash2 className="mr-2 size-4" />
              删除
            </Button>
          </div>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// 学生表单弹窗
// ---------------------------------------------------------------------------

function StudentFormDialog() {
  const {
    open,
    setOpen,
    currentItem,
    reloadData,
    schools,
    grades,
    classes,
    guardians,
    servicePlanMap,
  } = useStudents();

  const isEdit = open === "edit";
  const isOpen = open === "create" || open === "edit";

  const [form, setForm] = useState(initialStudentForm);
  const [saving, setSaving] = useState(false);

  // 记住当前是新增还是编辑，快捷新增关闭后恢复
  const [previousOpen, setPreviousOpen] = useState<"create" | "edit" | null>(
    null,
  );

  // 快捷新增表单状态
  const [schoolForm, setSchoolForm] = useState(initialSchoolForm);
  const [gradeForm, setGradeForm] = useState(initialGradeForm);
  const [classForm, setClassForm] = useState(initialClassForm);
  const [guardianForm, setGuardianForm] = useState(initialGuardianForm);
  const [quickSaving, setQuickSaving] = useState(false);

  const filteredClasses = useMemo(() => {
    return classes.filter((item) => {
      if (form.schoolId && item.schoolId !== form.schoolId) return false;
      if (form.gradeId && item.gradeId !== form.gradeId) return false;
      return true;
    });
  }, [classes, form.gradeId, form.schoolId]);
  const quickGuardianExactDuplicate = hasExactName(guardians, guardianForm.name);
  const quickGuardianSimilarItems = findSimilarNames(guardians, guardianForm.name);
  const quickGuardianPhoneExists = guardians.some(
    (item) => item.phone.trim() === guardianForm.phone.trim(),
  );
  const quickClassExactDuplicate = hasExactName(
    classes.filter((item) => item.gradeId === classForm.gradeId),
    classForm.name,
  );
  const quickGuardianDefaultPassword = useMemo(
    () => getDefaultLoginPassword(guardianForm.phone),
    [guardianForm.phone],
  );

  useEffect(() => {
    if (isEdit && currentItem) {
      const plan = servicePlanMap[currentItem.id];
      setForm({
        classId: currentItem.classId || "",
        gradeId: currentItem.gradeId || "",
        guardianId: currentItem.guardianId || "",
        id: currentItem.id,
        name: currentItem.name,
        paidAt: plan?.paidAt || currentItem.serviceSummary?.paidAt || "",
        paymentAmount: String(
          plan?.paymentAmount ||
            currentItem.serviceSummary?.paymentAmount ||
            0,
        ),
        paymentStatus:
          plan?.paymentStatus ||
          currentItem.serviceSummary?.paymentStatus ||
          "unpaid",
        remark: plan?.remark || "",
        schoolId: currentItem.schoolId || "",
        serviceEndDate:
          plan?.serviceEndDate ||
          currentItem.serviceSummary?.serviceEndDate ||
          "",
        servicePlanId: plan?.id || "",
        serviceStartDate:
          plan?.serviceStartDate ||
          currentItem.serviceSummary?.serviceStartDate ||
          "",
        status: currentItem.status,
      });
    } else if (open === "create") {
      setForm({
        ...initialStudentForm,
        gradeId: grades[0]?.id || "",
        guardianId: guardians[0]?.id || "",
        schoolId: schools[0]?.id || "",
      });
    }
  }, [open, currentItem, isEdit, servicePlanMap, grades, guardians, schools]);

  async function handleSave() {
    const school = schools.find((item) => item.id === form.schoolId);
    const grade = grades.find((item) => item.id === form.gradeId);
    const guardian = guardians.find((item) => item.id === form.guardianId);
    const classItem = classes.find((item) => item.id === form.classId);

    if (!form.name.trim() || !school || !grade || !guardian) {
      toast.error("学生、学校、年级、家长不能为空");
      return;
    }

    if (form.classId && !classItem) {
      toast.error("班级不存在");
      return;
    }

    setSaving(true);
    try {
      const student = await saveStudent({
        classId: classItem?.id || "",
        className: classItem?.name || "",
        grade: grade.name,
        gradeId: grade.id,
        guardianId: guardian.id,
        guardianName: guardian.name,
        guardianPhone: guardian.phone,
        id: form.id || undefined,
        name: form.name.trim(),
        schoolId: school.id,
        schoolName: school.name,
        status: form.status,
      });

      await saveStudentService({
        id: form.servicePlanId || undefined,
        paidAt: form.paidAt,
        paymentAmount: Number(form.paymentAmount || 0),
        paymentStatus: form.paymentStatus,
        remark: form.remark.trim(),
        serviceEndDate: form.serviceEndDate,
        serviceStartDate: form.serviceStartDate,
        studentId: student.id,
      });

      toast.success("已保存");
      setOpen(null);
      await reloadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  // 打开快捷新增弹窗
  function openQuickDialog(
    type: "quick-school" | "quick-grade" | "quick-class" | "quick-guardian",
  ) {
    setPreviousOpen(isEdit ? "edit" : "create");
    if (type === "quick-school") setSchoolForm(initialSchoolForm);
    if (type === "quick-grade") setGradeForm(initialGradeForm);
    if (type === "quick-class") {
      setClassForm({
        ...initialClassForm,
        gradeId: form.gradeId,
        schoolId: form.schoolId,
      });
    }
    if (type === "quick-guardian") setGuardianForm(initialGuardianForm);
    setOpen(type);
  }

  async function handleQuickSave() {
    if (
      open !== "quick-school" &&
      open !== "quick-grade" &&
      open !== "quick-class" &&
      open !== "quick-guardian"
    )
      return;

    setQuickSaving(true);
    try {
      if (open === "quick-school") {
        if (!schoolForm.name.trim()) throw new Error("学校名称不能为空");
        const item = await saveSchool({
          name: schoolForm.name.trim(),
          status: schoolForm.status,
        });
        setForm((c) => ({ ...c, schoolId: item.id, classId: "" }));
      }

      if (open === "quick-grade") {
        if (!gradeForm.name.trim()) throw new Error("年级名称不能为空");
        const item = await saveGrade({
          name: gradeForm.name.trim(),
          sort: Number(gradeForm.sort || 0),
          status: gradeForm.status,
        });
        setForm((c) => ({ ...c, classId: "", gradeId: item.id }));
      }

      if (open === "quick-class") {
        const school = schools.find((i) => i.id === classForm.schoolId);
        const grade = grades.find((i) => i.id === classForm.gradeId);
        if (!school || !grade || !classForm.name.trim())
          throw new Error("学校、年级、班级名称不能为空");
        if (quickClassExactDuplicate) {
          throw new Error("当前年级下已存在同名班级");
        }
        const item = await saveClass({
          gradeId: grade.id,
          gradeName: grade.name,
          name: classForm.name.trim(),
          schoolId: school.id,
          schoolName: school.name,
          status: classForm.status,
        });
        setForm((c) => ({
          ...c,
          classId: item.id,
          gradeId: item.gradeId,
          schoolId: item.schoolId,
        }));
      }

      if (open === "quick-guardian") {
        if (!guardianForm.name.trim() || !guardianForm.phone.trim())
          throw new Error("家长姓名和手机号不能为空");
        if (quickGuardianPhoneExists) {
          throw new Error("家长手机号已存在");
        }
        const item = await saveGuardianProfile({
          name: guardianForm.name.trim(),
          phone: guardianForm.phone.trim(),
          relationship: guardianForm.relationship.trim(),
          remark: guardianForm.remark.trim(),
          status: guardianForm.status,
        });
        setForm((c) => ({ ...c, guardianId: item.id }));
      }

      toast.success("已新增");
      await reloadData();
      // 返回学生表单
      setOpen(previousOpen);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setQuickSaving(false);
    }
  }

  const isQuickOpen =
    open === "quick-school" ||
    open === "quick-grade" ||
    open === "quick-class" ||
    open === "quick-guardian";

  const quickTitle =
    open === "quick-school"
      ? "新增学校"
      : open === "quick-grade"
        ? "新增年级"
        : open === "quick-class"
          ? "新增班级"
          : open === "quick-guardian"
            ? "新增家长"
            : "";

  return (
    <>
      {/* 学生表单弹窗 */}
      <Dialog open={isOpen} onOpenChange={() => setOpen(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? "编辑学生" : "新增学生"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <Field label="学生姓名">
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((c) => ({ ...c, name: e.target.value }))
                }
              />
            </Field>
            <Field label="学生状态">
              <Select
                value={form.status}
                onValueChange={(v) => setForm((c) => ({ ...c, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="paused">暂停</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="学校">
              <SelectWithAction
                onCreate={() => openQuickDialog("quick-school")}
              >
                <Select
                  value={form.schoolId}
                  onValueChange={(v) =>
                    setForm((c) => ({ ...c, classId: "", schoolId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择学校" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SelectWithAction>
            </Field>
            <Field label="年级">
              <SelectWithAction
                onCreate={() => openQuickDialog("quick-grade")}
              >
                <Select
                  value={form.gradeId}
                  onValueChange={(v) =>
                    setForm((c) => ({ ...c, classId: "", gradeId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择年级" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SelectWithAction>
            </Field>
            <Field label="班级">
              <SelectWithAction
                onCreate={() => openQuickDialog("quick-class")}
              >
                <Select
                  value={form.classId}
                  onValueChange={(v) => {
                    const item = classes.find((entry) => entry.id === v);
                    setForm((c) => ({
                      ...c,
                      classId: v,
                      gradeId: item?.gradeId || c.gradeId,
                      schoolId: item?.schoolId || c.schoolId,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择班级" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredClasses.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SelectWithAction>
            </Field>
            <Field label="家长">
              <SelectWithAction
                onCreate={() => openQuickDialog("quick-guardian")}
              >
                <Select
                  value={form.guardianId}
                  onValueChange={(v) =>
                    setForm((c) => ({ ...c, guardianId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择家长" />
                  </SelectTrigger>
                  <SelectContent>
                    {guardians.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} / {item.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SelectWithAction>
            </Field>
            <Field label="服务开始">
              <Input
                placeholder="2026-03-01"
                value={form.serviceStartDate}
                onChange={(e) =>
                  setForm((c) => ({ ...c, serviceStartDate: e.target.value }))
                }
              />
            </Field>
            <Field label="服务结束">
              <Input
                placeholder="2026-03-31"
                value={form.serviceEndDate}
                onChange={(e) =>
                  setForm((c) => ({ ...c, serviceEndDate: e.target.value }))
                }
              />
            </Field>
            <Field label="缴费状态">
              <Select
                value={form.paymentStatus}
                onValueChange={(v) =>
                  setForm((c) => ({ ...c, paymentStatus: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">已缴费</SelectItem>
                  <SelectItem value="unpaid">待缴费</SelectItem>
                  <SelectItem value="paused">已暂停</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="缴费金额">
              <Input
                value={form.paymentAmount}
                onChange={(e) =>
                  setForm((c) => ({ ...c, paymentAmount: e.target.value }))
                }
              />
            </Field>
            <Field label="缴费时间">
              <Input
                placeholder="2026-03-01"
                value={form.paidAt}
                onChange={(e) =>
                  setForm((c) => ({ ...c, paidAt: e.target.value }))
                }
              />
            </Field>
            <Field className="md:col-span-2" label="备注">
              <Textarea
                value={form.remark}
                onChange={(e) =>
                  setForm((c) => ({ ...c, remark: e.target.value }))
                }
              />
            </Field>
          </div>
          <DialogFooter>
            <Button disabled={saving} onClick={handleSave}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 快捷新增弹窗 */}
      <Dialog
        open={isQuickOpen}
        onOpenChange={(v) => {
          if (!v) setOpen(previousOpen);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{quickTitle}</DialogTitle>
          </DialogHeader>
          {open === "quick-school" ? (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>学校名称</Label>
                <Input
                  value={schoolForm.name}
                  onChange={(e) =>
                    setSchoolForm((c) => ({ ...c, name: e.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}
          {open === "quick-grade" ? (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>年级名称</Label>
                <Input
                  value={gradeForm.name}
                  onChange={(e) =>
                    setGradeForm((c) => ({ ...c, name: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>排序</Label>
                <Input
                  value={gradeForm.sort}
                  onChange={(e) =>
                    setGradeForm((c) => ({ ...c, sort: e.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}
          {open === "quick-class" ? (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>学校</Label>
                <Select
                  value={classForm.schoolId}
                  onValueChange={(v) =>
                    setClassForm((c) => ({ ...c, schoolId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择学校" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>年级</Label>
                <Select
                  value={classForm.gradeId}
                  onValueChange={(v) =>
                    setClassForm((c) => ({ ...c, gradeId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择年级" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>班级名称</Label>
                <Input
                  value={classForm.name}
                  onChange={(e) =>
                    setClassForm((c) => ({ ...c, name: e.target.value }))
                  }
                />
                {quickClassExactDuplicate ? (
                  <p className="text-sm text-destructive">当前年级下已存在同名班级</p>
                ) : null}
              </div>
            </div>
          ) : null}
          {open === "quick-guardian" ? (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>姓名</Label>
                <Input
                  value={guardianForm.name}
                  onChange={(e) =>
                    setGuardianForm((c) => ({ ...c, name: e.target.value }))
                  }
                />
              </div>
              <NameReminderAlert
                exact={quickGuardianExactDuplicate}
                label="家长"
                similarItems={quickGuardianSimilarItems}
              />
              <div className="grid gap-2">
                <Label>手机号</Label>
                <Input
                  value={guardianForm.phone}
                  onChange={(e) =>
                    setGuardianForm((c) => ({ ...c, phone: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>默认密码</Label>
                <Input readOnly value={quickGuardianDefaultPassword} />
                <p className="text-sm text-muted-foreground">
                  {getDefaultLoginPasswordHint(guardianForm.phone)}
                </p>
              </div>
              {quickGuardianPhoneExists ? (
                <Alert variant="destructive">
                  <AlertTitle>手机号已存在</AlertTitle>
                  <AlertDescription>当前手机号已被其他家长使用。</AlertDescription>
                </Alert>
              ) : null}
              <div className="grid gap-2">
                <Label>关系</Label>
                <Select
                  value={guardianForm.relationship || emptyRelationshipValue}
                  onValueChange={(value) =>
                    setGuardianForm((c) => ({
                      ...c,
                      relationship: value === emptyRelationshipValue ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="可不填写" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={emptyRelationshipValue}>不填写</SelectItem>
                    {parentRelationshipOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>备注</Label>
                <Textarea
                  value={guardianForm.remark}
                  onChange={(e) =>
                    setGuardianForm((c) => ({ ...c, remark: e.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              disabled={
                quickSaving ||
                (open === "quick-guardian" && quickGuardianPhoneExists) ||
                (open === "quick-class" && quickClassExactDuplicate)
              }
              onClick={handleQuickSave}
            >
              {quickSaving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// 字段组件
// ---------------------------------------------------------------------------

function Field({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 页面组件
// ---------------------------------------------------------------------------

export default function StudentsPage() {
  const [open, setOpen] = useDialogState<DialogType>();
  const [currentItem, setCurrentItem] = useState<StudentItem | null>(null);

  const [items, setItems] = useState<StudentItem[]>([]);
  const [servicePlans, setServicePlans] = useState<StudentServiceItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [guardians, setGuardians] = useState<GuardianProfileItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [
        studentItems,
        planItems,
        schoolItems,
        gradeItems,
        classItems,
        guardianItems,
      ] = await Promise.all([
        fetchStudents(),
        fetchStudentServices(),
        fetchSchools(),
        fetchGrades(),
        fetchClasses(),
        fetchGuardianProfiles(),
      ]);
      setItems(studentItems);
      setServicePlans(planItems);
      setSchools(schoolItems);
      setGrades(gradeItems);
      setClasses(classItems);
      setGuardians(guardianItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setItems([]);
      setServicePlans([]);
      setSchools([]);
      setGrades([]);
      setClasses([]);
      setGuardians([]);
    } finally {
      setLoading(false);
    }
  }

  const servicePlanMap = useMemo(() => {
    return servicePlans.reduce<Record<string, StudentServiceItem>>(
      (acc, item) => {
        if (acc[item.studentId]) return acc;
        acc[item.studentId] = item;
        return acc;
      },
      {},
    );
  }, [servicePlans]);

  const columns = useMemo(
    () => createColumns(servicePlanMap),
    [servicePlanMap],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const keyword = filterValue.toLowerCase();
      return [
        row.original.name,
        row.original.schoolName,
        row.original.grade,
        row.original.className,
        row.original.guardianName,
        row.original.guardianPhone,
      ]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(keyword));
    },
  });

  const contextValue = useMemo<StudentsContextValue>(
    () => ({
      open,
      setOpen,
      currentItem,
      setCurrentItem,
      reloadData: loadData,
      schools,
      grades,
      classes,
      guardians,
      servicePlanMap,
    }),
    [
      open,
      setOpen,
      currentItem,
      loadData,
      schools,
      grades,
      classes,
      guardians,
      servicePlanMap,
    ],
  );

  return (
    <StudentsContext.Provider value={contextValue}>
      <PageContent>
        {/* 标题 */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">学生</h2>
            <p className="text-muted-foreground">管理学生信息与服务</p>
          </div>
          <Button className="space-x-1" onClick={() => setOpen("create")}>
            <span>新增学生</span> <UserPlus size={18} />
          </Button>
        </div>

        {/* 数据表格 */}
        <div className="-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-x-12 lg:space-y-0">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              加载中…
            </div>
          ) : (
            <div className="space-y-4">
              <DataTableToolbar
                table={table}
                searchPlaceholder="搜索学生 / 学校 / 班级 / 家长…"
                filters={[
                  {
                    columnId: "status",
                    title: "状态",
                    options: statusOptions.map((o) => ({
                      label: o.label,
                      value: o.value,
                      icon: o.icon,
                    })),
                  },
                ]}
              />

              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} colSpan={header.colSpan}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} className="group/row">
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className="bg-background group-hover/row:bg-muted"
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          暂无数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <DataTablePagination table={table} />
            </div>
          )}
        </div>

        {/* 弹窗 */}
        <StudentFormDialog />
      </PageContent>
    </StudentsContext.Provider>
  );
}
