import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ChevronRight, Pencil, Plus, School, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageContent } from "@/components/page-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { cn } from "@/lib/utils";
import useDialogState from "@/hooks/use-dialog-state";
import { findSimilarNames, hasExactName } from "@/lib/name-check";
import {
  deleteClass,
  deleteGrade,
  deleteSchool,
  fetchClasses,
  fetchGrades,
  fetchSchools,
  fetchStudents,
  saveClass,
  saveGrade,
  saveSchool,
  type ClassItem,
  type GradeItem,
  type SchoolItem,
} from "@/lib/server-data";

// ── 类型与上下文 ──────────────────────────────────────────

type DialogType = "add-school" | "edit-school" | "edit-class" | "edit-grade";

type SchoolsContextValue = {
  open: DialogType | null;
  setOpen: (v: DialogType | null) => void;
  currentSchool: SchoolItem | null;
  setCurrentSchool: (v: SchoolItem | null) => void;
  currentClass: ClassItem | null;
  setCurrentClass: (v: ClassItem | null) => void;
  currentGrade: GradeItem | null;
  setCurrentGrade: (v: GradeItem | null) => void;
  schools: SchoolItem[];
  grades: GradeItem[];
  classes: ClassItem[];
  studentCountByClass: Record<string, number>;
  reloadData: () => void;
};

const SchoolsContext = createContext<SchoolsContextValue | null>(null);

function useSchoolsContext() {
  const ctx = useContext(SchoolsContext);
  if (!ctx) throw new Error("useSchoolsContext 需在 SchoolsPage 内使用");
  return ctx;
}

// ── 主页面 ────────────────────────────────────────────────

export default function SchoolsPage() {
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [studentCountByClass, setStudentCountByClass] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useDialogState<DialogType>();
  const [currentSchool, setCurrentSchool] = useState<SchoolItem | null>(null);
  const [currentClass, setCurrentClass] = useState<ClassItem | null>(null);
  const [currentGrade, setCurrentGrade] = useState<GradeItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [s, g, c, st] = await Promise.all([
        fetchSchools(),
        fetchGrades(),
        fetchClasses(),
        fetchStudents(),
      ]);
      setSchools(s);
      setGrades(g);
      setClasses(c);
      const countMap: Record<string, number> = {};
      for (const stu of st) {
        countMap[stu.classId] = (countMap[stu.classId] || 0) + 1;
      }
      setStudentCountByClass(countMap);
    } catch {
      toast.error("加载数据失败");
      setSchools([]);
      setGrades([]);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const ctx = useMemo<SchoolsContextValue>(
    () => ({
      open,
      setOpen,
      currentSchool,
      setCurrentSchool,
      currentClass,
      setCurrentClass,
      currentGrade,
      setCurrentGrade,
      schools,
      grades,
      classes,
      studentCountByClass,
      reloadData: loadData,
    }),
    [
      open,
      setOpen,
      currentSchool,
      currentClass,
      currentGrade,
      schools,
      grades,
      classes,
      studentCountByClass,
      loadData,
    ],
  );

  if (loading) {
    return (
      <PageContent>
        <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
          加载中...
        </div>
      </PageContent>
    );
  }

  return (
    <SchoolsContext.Provider value={ctx}>
      <PageContent>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">学校管理</h2>
            <p className="text-muted-foreground">
              管理学校、年级与班级的层级结构
            </p>
          </div>
          <Button onClick={() => setOpen("add-school")}>
            <Plus className="mr-1 h-4 w-4" />
            新增学校
          </Button>
        </div>

        {schools.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
            <School className="h-12 w-12" />
            <p>暂无学校，点击上方按钮创建</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {schools.map((s) => (
              <SchoolTreeItem key={s.id} school={s} />
            ))}
          </div>
        )}

        <SchoolsDialogs />
      </PageContent>
    </SchoolsContext.Provider>
  );
}

// ── 学校树节点 ──────────────────────────────────────────

function SchoolTreeItem({ school }: { school: SchoolItem }) {
  const { classes, grades, reloadData, studentCountByClass, setOpen, setCurrentSchool } =
    useSchoolsContext();
  const [isOpen, setIsOpen] = useState(true);

  const schoolClasses = useMemo(
    () => classes.filter((c) => c.schoolId === school.id),
    [classes, school.id],
  );

  const sortedGrades = useMemo(
    () => grades.slice().sort((a, b) => a.sort - b.sort),
    [grades],
  );

  // 按年级分组
  const gradeClassMap = useMemo(() => {
    const map: Record<string, ClassItem[]> = {};
    for (const c of schoolClasses) {
      (map[c.gradeId] ??= []).push(c);
    }
    return map;
  }, [schoolClasses]);

  const gradeCount = sortedGrades.length;
  const classCount = schoolClasses.length;
  const studentTotal = schoolClasses.reduce(
    (sum, c) => sum + (studentCountByClass[c.id] ?? 0),
    0,
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 hover:bg-muted/50">
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200",
              isOpen && "rotate-90",
            )}
          />
          <School className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="font-semibold">{school.name}</span>
          <Badge variant="outline" className="ml-1">
            {gradeCount}个年级 · {classCount}个班级
          </Badge>
          <span className="text-xs text-muted-foreground">
            {studentTotal}人
          </span>
          <Badge
            variant={school.status === "active" ? "default" : "secondary"}
          >
            {school.status === "active" ? "启用" : "暂停"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentSchool(school);
              setOpen("edit-school");
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={async (e) => {
              e.stopPropagation();
              if (!window.confirm(`确定删除学校「${school.name}」？`)) return;
              try {
                await deleteSchool(school.id);
                toast.success("学校已删除");
                reloadData();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "删除失败");
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 mt-2 space-y-3 border-l-2 border-muted pl-4">
          {sortedGrades.map((g) => (
            <GradeGroup
              key={g.id}
              grade={g}
              school={school}
              classes={gradeClassMap[g.id] ?? []}
            />
          ))}
          {gradeCount === 0 && (
            <p className="py-2 text-sm text-muted-foreground">暂无年级</p>
          )}
          <AddGradeInline />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── 年级分组（班级卡片） ────────────────────────────────

function GradeGroup({
  grade,
  school,
  classes: gradeClasses,
}: {
  grade: GradeItem;
  school: SchoolItem;
  classes: ClassItem[];
}) {
  const {
    studentCountByClass,
    setOpen,
    setCurrentClass,
    setCurrentGrade,
    reloadData,
  } = useSchoolsContext();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const exactDup = hasExactName(gradeClasses, newName);

  const handleQuickAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    if (exactDup) {
      toast.error(`「${grade.name}」下已存在同名班级`);
      return;
    }
    setSaving(true);
    try {
      await saveClass({
        name,
        schoolId: school.id,
        schoolName: school.name,
        gradeId: grade.id,
        gradeName: grade.name,
        status: "active",
      });
      toast.success(`班级「${name}」已添加`);
      setNewName("");
      setAdding(false);
      reloadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "添加失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          📚 {grade.name}
        </p>
        <Button
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={() => {
            setCurrentGrade(grade);
            setOpen("edit-grade");
          }}
        >
          <Pencil size={14} />
        </Button>
        <Button
          variant="ghost"
          className="h-6 w-6 p-0 text-destructive"
          onClick={async () => {
            if (!window.confirm(`确定删除年级「${grade.name}」？`)) return;
            try {
              await deleteGrade(grade.id);
              toast.success("年级已删除");
              reloadData();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "删除失败");
            }
          }}
        >
          <Trash2 size={14} />
        </Button>
        {!adding && (
          <Button
            variant="outline"
            size="sm"
            className="h-6 gap-1 px-2 text-xs"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3 w-3" />
            新增班级
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {gradeClasses.length === 0 && !adding && (
          <span className="text-xs text-muted-foreground">暂无班级</span>
        )}
        {gradeClasses.map((c) => (
          <div
            key={c.id}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
          >
            <span>{c.name}</span>
            <span className="text-muted-foreground">
              ({studentCountByClass[c.id] ?? 0}人)
            </span>
            <Button
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => {
                setCurrentClass(c);
                setOpen("edit-class");
              }}
            >
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              className="h-6 w-6 p-0 text-destructive"
              onClick={async () => {
                if (!window.confirm(`确定删除班级「${c.name}」？`)) return;
                try {
                  await deleteClass(c.id);
                  toast.success("班级已删除");
                  reloadData();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "删除失败");
                }
              }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}

        {adding && (
          <div className="inline-flex items-center gap-1">
            <Input
              className="h-7 w-[100px]"
              placeholder="班级名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
              autoFocus
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              disabled={saving || exactDup}
              onClick={handleQuickAdd}
            >
              确定
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7"
              onClick={() => {
                setAdding(false);
                setNewName("");
              }}
            >
              取消
            </Button>
          </div>
        )}
      </div>
      {adding && exactDup ? (
        <p className="mt-2 text-xs text-destructive">当前年级下已存在同名班级</p>
      ) : null}
    </div>
  );
}

// ── 学校内新增年级（内联） ──────────────────────────────

function AddGradeInline() {
  const { reloadData } = useSchoolsContext();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [sort, setSort] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await saveGrade({
        name: trimmed,
        sort: Number(sort) || 0,
        status: "active",
      });
      toast.success(`年级「${trimmed}」已添加`);
      setName("");
      setSort("");
      setAdding(false);
      reloadData();
    } catch {
      toast.error("添加失败");
    } finally {
      setSaving(false);
    }
  };

  if (!adding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-muted-foreground"
        onClick={() => setAdding(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        新增年级
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1 border-t border-dashed pt-2">
      <Input
        className="h-7 w-[100px]"
        placeholder="年级名称"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        autoFocus
      />
      <Input
        className="h-7 w-[60px]"
        placeholder="排序"
        type="number"
        value={sort}
        onChange={(e) => setSort(e.target.value)}
      />
      <Button
        size="sm"
        variant="outline"
        className="h-7"
        disabled={saving || !name.trim()}
        onClick={handleAdd}
      >
        添加
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-7"
        onClick={() => {
          setAdding(false);
          setName("");
          setSort("");
        }}
      >
        取消
      </Button>
    </div>
  );
}

// ── 弹窗容器 ──────────────────────────────────────────────

function SchoolsDialogs() {
  const { open } = useSchoolsContext();
  return (
    <>
      {(open === "add-school" || open === "edit-school") && <SchoolFormDialog />}
      {open === "edit-class" && <EditClassDialog />}
      {open === "edit-grade" && <EditGradeDialog />}
    </>
  );
}

// ── 学校表单弹窗 ────────────────────────────────────────

function SchoolFormDialog() {
  const { open, setOpen, currentSchool, schools, reloadData } =
    useSchoolsContext();
  const isEdit = open === "edit-school";
  const [form, setForm] = useState({
    name: isEdit && currentSchool ? currentSchool.name : "",
    status: isEdit && currentSchool ? currentSchool.status : "active",
  });
  const [saving, setSaving] = useState(false);

  const exactDup = hasExactName(schools, form.name, currentSchool?.id);
  const similar = findSimilarNames(schools, form.name, currentSchool?.id);

  const handleSave = async () => {
    if (exactDup) return;
    setSaving(true);
    try {
      await saveSchool({
        ...(isEdit && currentSchool ? { id: currentSchool.id } : {}),
        name: form.name.trim(),
        status: form.status,
      });
      toast.success(isEdit ? "学校已更新" : "学校已创建");
      setOpen(null);
      reloadData();
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => setOpen(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑学校" : "新增学校"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改学校信息" : "填写学校名称创建新学校"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>学校名称</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="请输入学校名称"
            />
            {exactDup && (
              <p className="text-sm text-destructive">
                已存在同名学校，请更换名称
              </p>
            )}
            {!exactDup && similar.length > 0 && (
              <p className="text-sm text-orange-500">
                发现相似名称：{similar.map((s) => s.name).join("、")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>状态</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">启用</SelectItem>
                <SelectItem value="paused">暂停</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(null)}>
            取消
          </Button>
          <Button
            disabled={saving || exactDup || !form.name.trim()}
            onClick={handleSave}
          >
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 编辑班级弹窗 ────────────────────────────────────────

function EditClassDialog() {
  const { setOpen, currentClass, classes, reloadData } = useSchoolsContext();
  const [form, setForm] = useState({
    name: currentClass?.name ?? "",
    status: currentClass?.status ?? "active",
  });
  const [saving, setSaving] = useState(false);

  if (!currentClass) return null;
  const siblingClasses = classes.filter(
    (item) => item.gradeId === currentClass.gradeId && item.id !== currentClass.id,
  );
  const exactDup = hasExactName(siblingClasses, form.name);

  const handleSave = async () => {
    if (exactDup) {
      toast.error(`「${currentClass.gradeName}」下已存在同名班级`);
      return;
    }
    setSaving(true);
    try {
      await saveClass({
        id: currentClass.id,
        name: form.name.trim(),
        status: form.status,
        schoolId: currentClass.schoolId,
        schoolName: currentClass.schoolName,
        gradeId: currentClass.gradeId,
        gradeName: currentClass.gradeName,
      });
      toast.success("班级已更新");
      setOpen(null);
      reloadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => setOpen(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑班级</DialogTitle>
          <DialogDescription>
            {currentClass.schoolName} / {currentClass.gradeName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>班级名称</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {exactDup ? (
              <p className="text-sm text-destructive">当前年级下已存在同名班级</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>状态</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">启用</SelectItem>
                <SelectItem value="paused">暂停</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(null)}>
            取消
          </Button>
          <Button disabled={saving || !form.name.trim() || exactDup} onClick={handleSave}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 编辑年级弹窗 ────────────────────────────────────────

function EditGradeDialog() {
  const { setOpen, currentGrade, reloadData } = useSchoolsContext();
  const [form, setForm] = useState({
    name: currentGrade?.name ?? "",
    sort: String(currentGrade?.sort ?? 0),
    status: currentGrade?.status ?? "active",
  });
  const [saving, setSaving] = useState(false);

  if (!currentGrade) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveGrade({
        id: currentGrade.id,
        name: form.name.trim(),
        sort: Number(form.sort) || 0,
        status: form.status,
      });
      toast.success("年级已更新");
      setOpen(null);
      reloadData();
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => setOpen(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑年级</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>年级名称</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>排序</Label>
            <Input
              type="number"
              value={form.sort}
              onChange={(e) => setForm({ ...form, sort: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>状态</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">启用</SelectItem>
                <SelectItem value="paused">暂停</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(null)}>
            取消
          </Button>
          <Button disabled={saving || !form.name.trim()} onClick={handleSave}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
