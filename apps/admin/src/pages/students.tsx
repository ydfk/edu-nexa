import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ListPagination } from "@/components/domain/list-pagination";
import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PageContent } from "@/components/page-content";
import { paginateItems } from "@/lib/list-page";
import {
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

const pageSize = 10;

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

const initialSchoolForm = {
  name: "",
  status: "active",
};

const initialGradeForm = {
  name: "",
  sort: "0",
  status: "active",
};

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

type QuickDialogType = "class" | "grade" | "guardian" | "school" | null;

export default function StudentsPage() {
  const [classForm, setClassForm] = useState(initialClassForm);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialStudentForm);
  const [gradeForm, setGradeForm] = useState(initialGradeForm);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [guardianForm, setGuardianForm] = useState(initialGuardianForm);
  const [guardians, setGuardians] = useState<GuardianProfileItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [quickDialogType, setQuickDialogType] = useState<QuickDialogType>(null);
  const [quickSaving, setQuickSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [schoolForm, setSchoolForm] = useState(initialSchoolForm);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [servicePlans, setServicePlans] = useState<StudentServiceItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [students, setStudents] = useState<StudentItem[]>([]);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [keyword, schoolFilter, statusFilter]);

  const servicePlanMap = useMemo(() => {
    return servicePlans.reduce<Record<string, StudentServiceItem>>((acc, item) => {
      if (acc[item.studentId]) {
        return acc;
      }
      acc[item.studentId] = item;
      return acc;
    }, {});
  }, [servicePlans]);

  const filteredClasses = useMemo(() => {
    return classes.filter((item) => {
      if (form.schoolId && item.schoolId !== form.schoolId) {
        return false;
      }
      if (form.gradeId && item.gradeId !== form.gradeId) {
        return false;
      }
      return true;
    });
  }, [classes, form.gradeId, form.schoolId]);

  const filteredStudents = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return students.filter((item) => {
      if (schoolFilter !== "all" && item.schoolId !== schoolFilter) {
        return false;
      }
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (!normalizedKeyword) {
        return true;
      }

      return [
        item.name,
        item.schoolName,
        item.grade,
        item.className,
        item.guardianName,
        item.guardianPhone,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedKeyword));
    });
  }, [keyword, schoolFilter, statusFilter, students]);

  const pagination = useMemo(
    () => paginateItems(filteredStudents, page, pageSize),
    [filteredStudents, page]
  );

  async function loadData() {
    setLoading(true);
    try {
      const [studentItems, planItems, schoolItems, gradeItems, classItems, guardianItems] =
        await Promise.all([
          fetchStudents(),
          fetchStudentServices(),
          fetchSchools(),
          fetchGrades(),
          fetchClasses(),
          fetchGuardianProfiles(),
        ]);
      setStudents(studentItems);
      setServicePlans(planItems);
      setSchools(schoolItems);
      setGrades(gradeItems);
      setClasses(classItems);
      setGuardians(guardianItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setStudents([]);
      setServicePlans([]);
      setSchools([]);
      setGrades([]);
      setClasses([]);
      setGuardians([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setForm({
      ...initialStudentForm,
      gradeId: grades[0]?.id || "",
      guardianId: guardians[0]?.id || "",
      schoolId: schools[0]?.id || "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(student: StudentItem) {
    const plan = servicePlanMap[student.id];
    setForm({
      classId: student.classId || "",
      gradeId: student.gradeId || "",
      guardianId: student.guardianId || "",
      id: student.id,
      name: student.name,
      paidAt: plan?.paidAt || student.serviceSummary?.paidAt || "",
      paymentAmount: String(plan?.paymentAmount || student.serviceSummary?.paymentAmount || 0),
      paymentStatus: plan?.paymentStatus || student.serviceSummary?.paymentStatus || "unpaid",
      remark: plan?.remark || "",
      schoolId: student.schoolId || "",
      serviceEndDate: plan?.serviceEndDate || student.serviceSummary?.serviceEndDate || "",
      servicePlanId: plan?.id || "",
      serviceStartDate: plan?.serviceStartDate || student.serviceSummary?.serviceStartDate || "",
      status: student.status,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const school = schools.find((item) => item.id === form.schoolId);
    const grade = grades.find((item) => item.id === form.gradeId);
    const guardian = guardians.find((item) => item.id === form.guardianId);
    const classItem = classes.find((item) => item.id === form.classId);

    if (!form.name.trim() || !school || !grade || !guardian) {
      toast.error("学生、学校、年级、监护人不能为空");
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
      setDialogOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  function openQuickDialog(type: QuickDialogType) {
    setQuickDialogType(type);
    if (type === "school") {
      setSchoolForm(initialSchoolForm);
    }
    if (type === "grade") {
      setGradeForm(initialGradeForm);
    }
    if (type === "class") {
      setClassForm({
        ...initialClassForm,
        gradeId: form.gradeId,
        schoolId: form.schoolId,
      });
    }
    if (type === "guardian") {
      setGuardianForm(initialGuardianForm);
    }
  }

  async function handleQuickSave() {
    if (!quickDialogType) {
      return;
    }

    setQuickSaving(true);
    try {
      if (quickDialogType === "school") {
        if (!schoolForm.name.trim()) {
          throw new Error("学校名称不能为空");
        }
        const item = await saveSchool({
          name: schoolForm.name.trim(),
          status: schoolForm.status,
        });
        setForm((current) => ({ ...current, schoolId: item.id, classId: "" }));
      }

      if (quickDialogType === "grade") {
        if (!gradeForm.name.trim()) {
          throw new Error("年级名称不能为空");
        }
        const item = await saveGrade({
          name: gradeForm.name.trim(),
          sort: Number(gradeForm.sort || 0),
          status: gradeForm.status,
        });
        setForm((current) => ({ ...current, classId: "", gradeId: item.id }));
      }

      if (quickDialogType === "class") {
        const school = schools.find((item) => item.id === classForm.schoolId);
        const grade = grades.find((item) => item.id === classForm.gradeId);
        if (!school || !grade || !classForm.name.trim()) {
          throw new Error("学校、年级、班级名称不能为空");
        }
        const item = await saveClass({
          gradeId: grade.id,
          gradeName: grade.name,
          name: classForm.name.trim(),
          schoolId: school.id,
          schoolName: school.name,
          status: classForm.status,
        });
        setForm((current) => ({
          ...current,
          classId: item.id,
          gradeId: item.gradeId,
          schoolId: item.schoolId,
        }));
      }

      if (quickDialogType === "guardian") {
        if (!guardianForm.name.trim() || !guardianForm.phone.trim()) {
          throw new Error("监护人姓名和手机号不能为空");
        }
        const item = await saveGuardianProfile({
          name: guardianForm.name.trim(),
          phone: guardianForm.phone.trim(),
          relationship: guardianForm.relationship.trim(),
          remark: guardianForm.remark.trim(),
          status: guardianForm.status,
        });
        setForm((current) => ({ ...current, guardianId: item.id }));
      }

      toast.success("已新增");
      setQuickDialogType(null);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setQuickSaving(false);
    }
  }

  return (
    <PageContent>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-lg">学生</CardTitle>
        <Button onClick={openCreateDialog}>新增学生</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.9fr_0.8fr]">
          <Input
            placeholder="搜索学生 / 学校 / 班级 / 监护人"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Select value={schoolFilter} onValueChange={setSchoolFilter}>
            <SelectTrigger>
              <SelectValue placeholder="学校" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部学校</SelectItem>
              {schools.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="active">启用</SelectItem>
              <SelectItem value="paused">暂停</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">加载中</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>学生</TableHead>
                  <TableHead>学校 / 年级 / 班级</TableHead>
                  <TableHead>监护人</TableHead>
                  <TableHead>服务周期</TableHead>
                  <TableHead>缴费</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.items.map((student) => {
                  const plan = servicePlanMap[student.id];
                  const paymentStatus =
                    plan?.paymentStatus || student.serviceSummary?.paymentStatus || "unpaid";

                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>
                        {[student.schoolName, student.grade, student.className]
                          .filter(Boolean)
                          .join(" / ") || "-"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{student.guardianName || "-"}</p>
                          <p className="text-sm text-muted-foreground">
                            {student.guardianPhone || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatRange(
                          plan?.serviceStartDate || student.serviceSummary?.serviceStartDate,
                          plan?.serviceEndDate || student.serviceSummary?.serviceEndDate
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p>¥ {plan?.paymentAmount || student.serviceSummary?.paymentAmount || 0}</p>
                          <StatusBadge status={paymentStatus} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={student.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" onClick={() => openEditDialog(student)}>
                          编辑
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {pagination.totalRows === 0 ? (
              <div className="text-sm text-muted-foreground">无</div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">共 {pagination.totalRows} 条</p>
              <ListPagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "编辑学生" : "新增学生"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <Field label="学生姓名">
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </Field>
            <Field label="学生状态">
              <Select
                value={form.status}
                onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}
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
                value={form.schoolId}
                placeholder="选择学校"
                onCreate={() => openQuickDialog("school")}
              >
                <Select
                  value={form.schoolId}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, classId: "", schoolId: value }))
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
                value={form.gradeId}
                placeholder="选择年级"
                onCreate={() => openQuickDialog("grade")}
              >
                <Select
                  value={form.gradeId}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, classId: "", gradeId: value }))
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
                value={form.classId}
                placeholder="选择班级"
                onCreate={() => openQuickDialog("class")}
              >
                <Select
                  value={form.classId}
                  onValueChange={(value) => {
                    const item = classes.find((entry) => entry.id === value);
                    setForm((current) => ({
                      ...current,
                      classId: value,
                      gradeId: item?.gradeId || current.gradeId,
                      schoolId: item?.schoolId || current.schoolId,
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
            <Field label="监护人">
              <SelectWithAction
                value={form.guardianId}
                placeholder="选择监护人"
                onCreate={() => openQuickDialog("guardian")}
              >
                <Select
                  value={form.guardianId}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, guardianId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择监护人" />
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
                onChange={(event) =>
                  setForm((current) => ({ ...current, serviceStartDate: event.target.value }))
                }
              />
            </Field>
            <Field label="服务结束">
              <Input
                placeholder="2026-03-31"
                value={form.serviceEndDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, serviceEndDate: event.target.value }))
                }
              />
            </Field>
            <Field label="缴费状态">
              <Select
                value={form.paymentStatus}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, paymentStatus: value }))
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
                onChange={(event) =>
                  setForm((current) => ({ ...current, paymentAmount: event.target.value }))
                }
              />
            </Field>
            <Field label="缴费时间">
              <Input
                placeholder="2026-03-01"
                value={form.paidAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, paidAt: event.target.value }))
                }
              />
            </Field>
            <Field className="md:col-span-2" label="备注">
              <Textarea
                value={form.remark}
                onChange={(event) =>
                  setForm((current) => ({ ...current, remark: event.target.value }))
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

      <Dialog open={quickDialogType !== null} onOpenChange={(open) => !open && setQuickDialogType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{getQuickDialogTitle(quickDialogType)}</DialogTitle>
          </DialogHeader>
          {quickDialogType === "school" ? (
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
            </div>
          ) : null}
          {quickDialogType === "grade" ? (
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
              <div className="grid gap-2">
                <Label>排序</Label>
                <Input
                  value={gradeForm.sort}
                  onChange={(event) =>
                    setGradeForm((current) => ({ ...current, sort: event.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}
          {quickDialogType === "class" ? (
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
            </div>
          ) : null}
          {quickDialogType === "guardian" ? (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>姓名</Label>
                <Input
                  value={guardianForm.name}
                  onChange={(event) =>
                    setGuardianForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>手机号</Label>
                <Input
                  value={guardianForm.phone}
                  onChange={(event) =>
                    setGuardianForm((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>关系</Label>
                <Input
                  value={guardianForm.relationship}
                  onChange={(event) =>
                    setGuardianForm((current) => ({
                      ...current,
                      relationship: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>备注</Label>
                <Textarea
                  value={guardianForm.remark}
                  onChange={(event) =>
                    setGuardianForm((current) => ({ ...current, remark: event.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button disabled={quickSaving} onClick={handleQuickSave}>
              {quickSaving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    </PageContent>
  );
}

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

function SelectWithAction({
  children,
  onCreate,
}: {
  children: ReactNode;
  onCreate: () => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="space-y-2">
      {children}
      <Button className="w-full justify-start" size="sm" variant="outline" onClick={onCreate}>
        <Plus className="mr-2 size-4" />
        新增
      </Button>
    </div>
  );
}

function formatRange(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) {
    return "-";
  }

  return `${startDate || "--"} 至 ${endDate || "--"}`;
}

function getQuickDialogTitle(type: QuickDialogType) {
  if (type === "school") {
    return "新增学校";
  }
  if (type === "grade") {
    return "新增年级";
  }
  if (type === "class") {
    return "新增班级";
  }
  if (type === "guardian") {
    return "新增监护人";
  }

  return "";
}
