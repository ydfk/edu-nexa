import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageContent } from "@/components/page-content";
import { findSimilarNames, hasExactName } from "@/lib/name-check";
import {
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
  type StudentItem,
} from "@/lib/server-data";

const initialSchoolForm = {
  id: "",
  name: "",
  status: "active",
};

const initialGradeForm = {
  id: "",
  name: "",
  sort: "0",
  status: "active",
};

const initialClassForm = {
  gradeId: "",
  id: "",
  name: "",
  schoolId: "",
  status: "active",
};

type SchoolTreeNode = {
  school: SchoolItem;
  grades: Array<{
    classCount: number;
    classes: ClassItem[];
    grade: GradeItem | null;
    key: string;
    label: string;
    studentCount: number;
  }>;
  studentCount: number;
};

export default function SchoolsPage() {
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [classForm, setClassForm] = useState(initialClassForm);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [gradeForm, setGradeForm] = useState(initialGradeForm);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"class" | "grade" | "school" | null>(null);
  const [schoolDialogOpen, setSchoolDialogOpen] = useState(false);
  const [schoolForm, setSchoolForm] = useState(initialSchoolForm);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);

  useEffect(() => {
    void loadData();
  }, []);

  const schoolExactDuplicate = hasExactName(schools, schoolForm.name, schoolForm.id);
  const schoolSimilarItems = findSimilarNames(schools, schoolForm.name, schoolForm.id);
  const gradeExactDuplicate = hasExactName(grades, gradeForm.name, gradeForm.id);
  const gradeSimilarItems = findSimilarNames(grades, gradeForm.name, gradeForm.id);
  const classExactDuplicate = hasExactName(classes, classForm.name, classForm.id);
  const classSimilarItems = findSimilarNames(classes, classForm.name, classForm.id);

  const studentCountByClassID = useMemo(() => {
    return students.reduce<Record<string, number>>((acc, item) => {
      if (!item.classId) {
        return acc;
      }
      acc[item.classId] = (acc[item.classId] || 0) + 1;
      return acc;
    }, {});
  }, [students]);

  const studentCountBySchoolID = useMemo(() => {
    return students.reduce<Record<string, number>>((acc, item) => {
      if (!item.schoolId) {
        return acc;
      }
      acc[item.schoolId] = (acc[item.schoolId] || 0) + 1;
      return acc;
    }, {});
  }, [students]);

  const schoolTree = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return schools
      .map<SchoolTreeNode>((school) => {
        const schoolClasses = classes.filter((item) => item.schoolId === school.id);
        const groupedMap = new Map<string, ClassItem[]>();

        schoolClasses.forEach((item) => {
          const key = item.gradeId || "__ungrouped__";
          const current = groupedMap.get(key) || [];
          current.push(item);
          groupedMap.set(key, current);
        });

        const gradeItems = Array.from(groupedMap.entries())
          .map(([gradeID, gradeClasses]) => {
            const grade = grades.find((item) => item.id === gradeID) || null;
            const studentCount = gradeClasses.reduce((total, item) => {
              return total + (studentCountByClassID[item.id] || 0);
            }, 0);

            return {
              classCount: gradeClasses.length,
              classes: gradeClasses.sort((left, right) => left.name.localeCompare(right.name, "zh-CN")),
              grade,
              key: gradeID,
              label: grade?.name || gradeClasses[0]?.gradeName || "未分组年级",
              studentCount,
            };
          })
          .sort((left, right) => {
            const leftSort = left.grade?.sort || 999;
            const rightSort = right.grade?.sort || 999;
            if (leftSort !== rightSort) {
              return leftSort - rightSort;
            }
            return left.label.localeCompare(right.label, "zh-CN");
          });

        return {
          grades: gradeItems,
          school,
          studentCount: studentCountBySchoolID[school.id] || 0,
        };
      })
      .filter((node) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [
          node.school.name,
          ...node.grades.map((item) => item.label),
          ...node.grades.flatMap((item) => item.classes.map((entry) => entry.name)),
        ]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedKeyword));
      })
      .sort((left, right) => left.school.name.localeCompare(right.school.name, "zh-CN"));
  }, [classes, grades, keyword, schools, studentCountByClassID, studentCountBySchoolID]);

  async function loadData() {
    setLoading(true);
    try {
      const [schoolItems, gradeItems, classItems, studentItems] = await Promise.all([
        fetchSchools(),
        fetchGrades(),
        fetchClasses(),
        fetchStudents(),
      ]);
      setSchools(schoolItems);
      setGrades(gradeItems);
      setClasses(classItems);
      setStudents(studentItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setSchools([]);
      setGrades([]);
      setClasses([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  function openSchoolDialog(item?: SchoolItem) {
    setSchoolForm(
      item
        ? {
            id: item.id,
            name: item.name,
            status: item.status,
          }
        : initialSchoolForm
    );
    setSchoolDialogOpen(true);
  }

  function openGradeDialog(item?: GradeItem) {
    setGradeForm(
      item
        ? {
            id: item.id,
            name: item.name,
            sort: String(item.sort),
            status: item.status,
          }
        : initialGradeForm
    );
    setGradeDialogOpen(true);
  }

  function openClassDialog(item?: ClassItem, preset?: Partial<typeof initialClassForm>) {
    setClassForm(
      item
        ? {
            gradeId: item.gradeId,
            id: item.id,
            name: item.name,
            schoolId: item.schoolId,
            status: item.status,
          }
        : {
            ...initialClassForm,
            gradeId: preset?.gradeId || grades[0]?.id || "",
            schoolId: preset?.schoolId || schools[0]?.id || "",
            status: preset?.status || "active",
          }
    );
    setClassDialogOpen(true);
  }

  async function handleSaveSchool() {
    if (!schoolForm.name.trim()) {
      toast.error("学校名称不能为空");
      return;
    }
    if (schoolExactDuplicate) {
      toast.error("学校名称已存在");
      return;
    }

    setSaving("school");
    try {
      await saveSchool({
        id: schoolForm.id || undefined,
        name: schoolForm.name.trim(),
        status: schoolForm.status,
      });
      toast.success("已保存");
      setSchoolDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveGrade() {
    if (!gradeForm.name.trim()) {
      toast.error("年级名称不能为空");
      return;
    }
    if (gradeExactDuplicate) {
      toast.error("年级名称已存在");
      return;
    }

    setSaving("grade");
    try {
      await saveGrade({
        id: gradeForm.id || undefined,
        name: gradeForm.name.trim(),
        sort: Number(gradeForm.sort || 0),
        status: gradeForm.status,
      });
      toast.success("已保存");
      setGradeDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveClass() {
    const school = schools.find((item) => item.id === classForm.schoolId);
    const grade = grades.find((item) => item.id === classForm.gradeId);
    if (!school || !grade || !classForm.name.trim()) {
      toast.error("学校、年级、班级名称不能为空");
      return;
    }
    if (classExactDuplicate) {
      toast.error("班级名称已存在");
      return;
    }

    setSaving("class");
    try {
      await saveClass({
        gradeId: grade.id,
        gradeName: grade.name,
        id: classForm.id || undefined,
        name: classForm.name.trim(),
        schoolId: school.id,
        schoolName: school.name,
        status: classForm.status,
      });
      toast.success("已保存");
      setClassDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(null);
    }
  }

  return (
    <PageContent>
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">学校</h1>
          <p className="text-sm text-muted-foreground">共 {schoolTree.length} 所</p>
        </div>
        <Button size="sm" onClick={() => openSchoolDialog()}>
          <Plus data-icon="inline-start" />
          新增学校
        </Button>
      </div>

      <Card>
        <CardHeader>
          <Input
            placeholder="搜索学校 / 年级 / 班级"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {loading ? <div className="text-sm text-muted-foreground">加载中</div> : null}
          {!loading && schoolTree.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              暂无学校
            </div>
          ) : null}
          {!loading
            ? schoolTree.map((node) => (
                <Card key={node.school.id} className="overflow-hidden">
                  <CardHeader className="flex flex-col gap-4 border-b bg-muted/20 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="text-2xl">{node.school.name}</CardTitle>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary">{node.grades.length} 个年级</Badge>
                        <Badge variant="outline">{node.studentCount} 名学生</Badge>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => openClassDialog(undefined, { schoolId: node.school.id })}
                      >
                        <Plus data-icon="inline-start" />
                        新增班级
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openSchoolDialog(node.school)}>
                        编辑学校
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-6">
                    {node.grades.length > 0 ? (
                      node.grades.map((gradeNode) => (
                        <Card
                          key={`${node.school.id}-${gradeNode.key}`}
                          className="border-dashed shadow-none"
                        >
                          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <CardTitle className="text-base">{gradeNode.label}</CardTitle>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge variant="secondary">{gradeNode.classCount} 个班级</Badge>
                                <Badge variant="outline">{gradeNode.studentCount} 名学生</Badge>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  openClassDialog(undefined, {
                                    gradeId: gradeNode.grade?.id || "",
                                    schoolId: node.school.id,
                                  })
                                }
                              >
                                <Plus data-icon="inline-start" />
                                新增班级
                              </Button>
                              {gradeNode.grade ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openGradeDialog(gradeNode.grade || undefined)}
                                >
                                  编辑年级
                                </Button>
                              ) : null}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>班级</TableHead>
                                  <TableHead>学生数</TableHead>
                                  <TableHead>状态</TableHead>
                                  <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {gradeNode.classes.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{studentCountByClassID[item.id] || 0}</TableCell>
                                    <TableCell>
                                      <Badge variant={item.status === "active" ? "secondary" : "outline"}>
                                        {item.status === "active" ? "启用" : "暂停"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button size="sm" variant="outline" onClick={() => openClassDialog(item)}>
                                        编辑
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                        暂无班级
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            : null}
        </CardContent>
      </Card>

      <Dialog open={schoolDialogOpen} onOpenChange={setSchoolDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{schoolForm.id ? "编辑学校" : "新增学校"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>学校名称</Label>
              <Input
                value={schoolForm.name}
                onChange={(event) =>
                  setSchoolForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <DuplicateAlert exact={schoolExactDuplicate} similarItems={schoolSimilarItems} />
            <div className="grid gap-2">
              <Label>状态</Label>
              <Select
                value={schoolForm.status}
                onValueChange={(value) =>
                  setSchoolForm((current) => ({ ...current, status: value }))
                }
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
            <Button disabled={saving === "school" || schoolExactDuplicate} onClick={handleSaveSchool}>
              {saving === "school" ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{gradeForm.id ? "编辑年级" : "新增年级"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>年级名称</Label>
              <Input
                value={gradeForm.name}
                onChange={(event) =>
                  setGradeForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <DuplicateAlert exact={gradeExactDuplicate} similarItems={gradeSimilarItems} />
            <div className="grid gap-2">
              <Label>排序</Label>
              <Input
                value={gradeForm.sort}
                onChange={(event) =>
                  setGradeForm((current) => ({ ...current, sort: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>状态</Label>
              <Select
                value={gradeForm.status}
                onValueChange={(value) =>
                  setGradeForm((current) => ({ ...current, status: value }))
                }
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
            <Button disabled={saving === "grade" || gradeExactDuplicate} onClick={handleSaveGrade}>
              {saving === "grade" ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{classForm.id ? "编辑班级" : "新增班级"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>学校</Label>
              <Select
                value={classForm.schoolId}
                onValueChange={(value) =>
                  setClassForm((current) => ({ ...current, schoolId: value }))
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
                onValueChange={(value) =>
                  setClassForm((current) => ({ ...current, gradeId: value }))
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
                onChange={(event) =>
                  setClassForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <DuplicateAlert exact={classExactDuplicate} similarItems={classSimilarItems} />
            <div className="grid gap-2">
              <Label>状态</Label>
              <Select
                value={classForm.status}
                onValueChange={(value) =>
                  setClassForm((current) => ({ ...current, status: value }))
                }
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
            <Button disabled={saving === "class" || classExactDuplicate} onClick={handleSaveClass}>
              {saving === "class" ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PageContent>
  );
}

function DuplicateAlert({
  exact,
  similarItems,
}: {
  exact: boolean;
  similarItems: Array<{ id: string; name: string }>;
}) {
  if (!exact && similarItems.length === 0) {
    return null;
  }

  return (
    <Alert variant={exact ? "destructive" : "default"}>
      <AlertTriangle className="size-4" />
      <AlertTitle>{exact ? "名称已存在" : "发现相似名称"}</AlertTitle>
      <AlertDescription>
        {exact ? "当前名称不能重复。" : similarItems.map((item) => item.name).join("、")}
      </AlertDescription>
    </Alert>
  );
}
