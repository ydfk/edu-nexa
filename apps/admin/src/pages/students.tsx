import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { useAutoSelectSingleID } from "@/hooks/use-auto-select-single-id";
import { findSimilarNames, hasExactName } from "@/lib/name-check";
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
  saveClass,
  saveGrade,
  saveGuardianProfile,
  saveSchool,
  saveStudent,
  type ClassItem,
  type GradeItem,
  type GuardianProfileItem,
  type SchoolItem,
  type StudentItem,
} from "@/lib/server-data";
import { useAdminSession } from "@/lib/auth/session";

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

const genderOptions = [
  { label: "男", value: "male" },
  { label: "女", value: "female" },
] as const;

const genderLabelMap: Record<string, string> = {
  female: "女",
  male: "男",
};

const statusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" }
> = {
  active: { label: "启用", variant: "default" },
  paused: { label: "暂停", variant: "secondary" },
};

const initialStudentForm = {
  classId: "",
  gender: "",
  gradeId: "",
  guardianId: "",
  id: "",
  name: "",
  schoolId: "",
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
  password: "",
  phone: "",
  relationship: "",
  remark: "",
  status: "active",
};

function isActiveItem(item: { status: string }) {
  return !item.status || item.status === "active";
}

function buildSelectableItems<T extends { id: string; status: string }>(
  items: T[],
  selectedID: string,
) {
  const activeItems = items.filter(isActiveItem);
  if (!selectedID || activeItems.some((item) => item.id === selectedID)) {
    return activeItems;
  }

  const currentItem = items.find((item) => item.id === selectedID);
  return currentItem ? [...activeItems, currentItem] : activeItems;
}

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
};

const StudentsContext = createContext<StudentsContextValue | null>(null);

function useStudents() {
  const ctx = useContext(StudentsContext);
  if (!ctx)
    throw new Error("useStudents must be used within StudentsProvider");
  return ctx;
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

function createColumns(canManageStudents: boolean): ColumnDef<StudentItem>[] {
  const baseColumns: ColumnDef<StudentItem>[] = [
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
      accessorKey: "gender",
      header: "性别",
      cell: ({ row }) => genderLabelMap[row.original.gender || ""] || "-",
      enableSorting: false,
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
  ];

  if (!canManageStudents) {
    return baseColumns;
  }

  return [
    ...baseColumns,
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
              className="text-destructive"
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
  } = useStudents();

  const isEdit = open === "edit";
  const isOpen = open === "create" || open === "edit";

  const [form, setForm] = useState(initialStudentForm);
  const [saving, setSaving] = useState(false);
  const previousDialogRef = useRef<DialogType | null>(null);

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

  const selectableSchools = useMemo(
    () => buildSelectableItems(schools, form.schoolId),
    [schools, form.schoolId],
  );
  const selectableGrades = useMemo(
    () => (form.schoolId ? buildSelectableItems(grades, form.gradeId) : []),
    [grades, form.gradeId, form.schoolId],
  );
  const selectableGuardians = useMemo(
    () => buildSelectableItems(guardians, form.guardianId),
    [guardians, form.guardianId],
  );

  const filteredClasses = useMemo(() => {
    if (!form.schoolId || !form.gradeId) {
      return [];
    }

    return buildSelectableItems(classes, form.classId).filter((item) => {
      if (form.schoolId && item.schoolId !== form.schoolId) return false;
      if (form.gradeId && item.gradeId !== form.gradeId) return false;
      return true;
    });
  }, [classes, form.classId, form.gradeId, form.schoolId]);
  const quickClassSchools = useMemo(
    () => schools.filter(isActiveItem),
    [schools],
  );
  const quickClassGrades = useMemo(
    () => grades.filter(isActiveItem),
    [grades],
  );
  const quickGuardianExactDuplicate = hasExactName(guardians, guardianForm.name);
  const quickGuardianSimilarItems = findSimilarNames(guardians, guardianForm.name);
  const quickGuardianPhoneExists = guardians.some(
    (item) => item.phone.trim() === guardianForm.phone.trim(),
  );
  const quickClassExactDuplicate = hasExactName(
    classes.filter((item) => item.gradeId === classForm.gradeId),
    classForm.name,
  );
  useEffect(() => {
    if (isEdit && currentItem) {
      setForm({
        classId: currentItem.classId || "",
        gender: currentItem.gender || "",
        gradeId: currentItem.gradeId || "",
        guardianId: currentItem.guardianId || "",
        id: currentItem.id,
        name: currentItem.name,
        schoolId: currentItem.schoolId || "",
        status: currentItem.status,
      });
    } else if (
      open === "create" &&
      previousDialogRef.current !== "quick-school" &&
      previousDialogRef.current !== "quick-grade" &&
      previousDialogRef.current !== "quick-class" &&
      previousDialogRef.current !== "quick-guardian"
    ) {
      setForm(initialStudentForm);
    }

    previousDialogRef.current = open;
  }, [open, currentItem, isEdit]);

  const handleAutoSelectSchool = useCallback((item: SchoolItem) => {
    setForm((current) => {
      if (current.schoolId === item.id) {
        return current;
      }
      return { ...current, classId: "", gradeId: "", schoolId: item.id };
    });
  }, []);

  const handleAutoSelectGrade = useCallback((item: GradeItem) => {
    setForm((current) => {
      if (current.gradeId === item.id) {
        return current;
      }
      return { ...current, classId: "", gradeId: item.id };
    });
  }, []);

  const handleAutoSelectClass = useCallback((item: ClassItem) => {
    setForm((current) => {
      if (current.classId === item.id) {
        return current;
      }
      return {
        ...current,
        classId: item.id,
        gradeId: item.gradeId || current.gradeId,
        schoolId: item.schoolId || current.schoolId,
      };
    });
  }, []);

  const handleAutoSelectGuardian = useCallback((item: GuardianProfileItem) => {
    setForm((current) => {
      if (current.guardianId === item.id) {
        return current;
      }
      return { ...current, guardianId: item.id };
    });
  }, []);

  const handleAutoSelectQuickClassSchool = useCallback((item: SchoolItem) => {
    setClassForm((current) => {
      if (current.schoolId === item.id) {
        return current;
      }
      return { ...current, schoolId: item.id };
    });
  }, []);

  const handleAutoSelectQuickClassGrade = useCallback((item: GradeItem) => {
    setClassForm((current) => {
      if (current.gradeId === item.id) {
        return current;
      }
      return { ...current, gradeId: item.id };
    });
  }, []);

  useAutoSelectSingleID(
    selectableSchools,
    form.schoolId,
    handleAutoSelectSchool,
    isOpen,
  );
  useAutoSelectSingleID(
    selectableGrades,
    form.gradeId,
    handleAutoSelectGrade,
    isOpen && !!form.schoolId,
  );
  useAutoSelectSingleID(
    filteredClasses,
    form.classId,
    handleAutoSelectClass,
    isOpen && !!form.schoolId && !!form.gradeId,
  );
  useAutoSelectSingleID(
    selectableGuardians,
    form.guardianId,
    handleAutoSelectGuardian,
    isOpen,
  );
  useAutoSelectSingleID(
    quickClassSchools,
    classForm.schoolId,
    handleAutoSelectQuickClassSchool,
    open === "quick-class",
  );
  useAutoSelectSingleID(
    quickClassGrades,
    classForm.gradeId,
    handleAutoSelectQuickClassGrade,
    open === "quick-class",
  );

  async function handleSave() {
    const school = schools.find((item) => item.id === form.schoolId);
    const grade = grades.find((item) => item.id === form.gradeId);
    const guardian = guardians.find((item) => item.id === form.guardianId);
    const classItem = classes.find((item) => item.id === form.classId);

    if (!form.name.trim() || !form.gender || !school || !grade || !classItem || !guardian) {
      toast.error("学生姓名、性别、学校、年级、班级、家长不能为空");
      return;
    }

    setSaving(true);
    try {
      await saveStudent({
        classId: classItem.id,
        className: classItem.name,
        gender: form.gender,
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
    if (type === "quick-guardian") {
      setGuardianForm(initialGuardianForm);
    }
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
        setForm((c) => ({ ...c, schoolId: item.id, gradeId: "", classId: "" }));
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
          sort: 0,
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
        throw new Error("家长姓名和账号不能为空");
        if (!guardianForm.password.trim()) {
          throw new Error("密码不能为空");
        }
        if (quickGuardianPhoneExists) {
          throw new Error("家长账号已存在");
        }
        const item = await saveGuardianProfile({
          name: guardianForm.name.trim(),
          password: guardianForm.password.trim(),
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
            <Field label="学生姓名" required>
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
            <Field label="性别" required>
              <Select
                value={form.gender}
                onValueChange={(v) => setForm((c) => ({ ...c, gender: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择性别" />
                </SelectTrigger>
                <SelectContent>
                  {genderOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="学校" required>              <SelectWithAction
                onCreate={() => openQuickDialog("quick-school")}
              >
                <Select
                  value={form.schoolId}
                  onValueChange={(v) =>
                    setForm((c) => ({ ...c, schoolId: v, gradeId: "", classId: "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择学校" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableSchools.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SelectWithAction>
            </Field>
            <Field label="年级" required>              <SelectWithAction
                onCreate={() => openQuickDialog("quick-grade")}
              >
                <Select
                  disabled={!form.schoolId}
                  value={form.gradeId}
                  onValueChange={(v) =>
                    setForm((c) => ({ ...c, classId: "", gradeId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择年级" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableGrades.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SelectWithAction>
            </Field>
            <Field label="班级" required>              <SelectWithAction
                onCreate={() => openQuickDialog("quick-class")}
              >
                <Select
                  disabled={!form.schoolId || !form.gradeId}
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
            <Field label="家长" required>              <SelectWithAction
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
                    {selectableGuardians.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} / {item.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SelectWithAction>
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
                <Label required>学校名称</Label>
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
                <Label required>年级名称</Label>
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
                <Label required>学校</Label>
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
                    {schools.filter(isActiveItem).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label required>年级</Label>
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
                    {grades.filter(isActiveItem).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label required>班级名称</Label>
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
                <Label required>姓名</Label>
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
                <Label required>账号</Label>
                <Input
                  value={guardianForm.phone}
                  onChange={(e) =>
                    setGuardianForm((c) => ({ ...c, phone: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label required>密码</Label>
                <Input
                  type="password"
                  value={guardianForm.password}
                  onChange={(e) =>
                    setGuardianForm((c) => ({ ...c, password: e.target.value }))
                  }
                  placeholder="请输入密码"
                />
              </div>
              {quickGuardianPhoneExists ? (
                <Alert variant="destructive">
                  <AlertTitle>账号已存在</AlertTitle>
                  <AlertDescription>当前账号已被其他家长使用。</AlertDescription>
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
  required,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 block" required={required}>{label}</Label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 页面组件
// ---------------------------------------------------------------------------

export default function StudentsPage() {
  const session = useAdminSession();
  const [open, setOpen] = useDialogState<DialogType>();
  const [currentItem, setCurrentItem] = useState<StudentItem | null>(null);

  const [items, setItems] = useState<StudentItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [guardians, setGuardians] = useState<GuardianProfileItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const canManageStudents = !!session.user?.roles.some(
    (role) => role === "admin" || role === "teacher",
  );
  const isGuardian = !!session.user?.roles.includes("guardian");

  useEffect(() => {
    void loadData();
  }, [session.user?.phone, isGuardian]);

  async function loadData() {
    setLoading(true);
    try {
      const [
        studentItems,
        schoolItems,
        gradeItems,
        classItems,
        guardianItems,
      ] = await Promise.all([
        fetchStudents(isGuardian ? { guardianPhone: session.user?.phone || "" } : undefined),
        fetchSchools(),
        fetchGrades(),
        fetchClasses(),
        fetchGuardianProfiles(),
      ]);
      setItems(studentItems);
      setSchools(schoolItems);
      setGrades(gradeItems);
      setClasses(classItems);
      setGuardians(guardianItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setItems([]);
      setSchools([]);
      setGrades([]);
      setClasses([]);
      setGuardians([]);
    } finally {
      setLoading(false);
    }
  }

  const columns = useMemo(() => createColumns(canManageStudents), [canManageStudents]);

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
    ],
  );

  return (
    <StudentsContext.Provider value={contextValue}>
      <PageContent>
        {/* 标题 */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">学生</h2>
            <p className="text-muted-foreground">
              {canManageStudents ? "管理学生信息与服务" : "查看我的学生信息与服务"}
            </p>
          </div>
          {canManageStudents ? (
            <Button className="space-x-1" onClick={() => setOpen("create")}>
              <span>新增学生</span> <UserPlus size={18} />
            </Button>
          ) : null}
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
        {canManageStudents ? <StudentFormDialog /> : null}
      </PageContent>
    </StudentsContext.Provider>
  );
}
