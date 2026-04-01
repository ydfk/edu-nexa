import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ListPagination } from "@/components/domain/list-pagination";
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
import { useAdminSession } from "@/lib/auth/session";
import { paginateItems } from "@/lib/list-page";
import {
  fetchClasses,
  fetchDailyHomework,
  fetchSchools,
  saveDailyHomework,
  type ClassItem,
  type DailyHomeworkItem,
  type SchoolItem,
} from "@/lib/server-data";

const pageSize = 10;
const initialForm = {
  classId: "",
  content: "",
  id: "",
  remark: "",
  schoolId: "",
  serviceDate: "",
};

export default function DailyHomeworkPage() {
  const session = useAdminSession();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState<DailyHomeworkItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [schools, setSchools] = useState<SchoolItem[]>([]);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [keyword, schoolFilter]);

  const filteredClasses = useMemo(() => {
    if (!form.schoolId) {
      return classes;
    }

    return classes.filter((item) => item.schoolId === form.schoolId);
  }, [classes, form.schoolId]);

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return items.filter((item) => {
      const matchedSchool = schools.find((entry) => entry.name === item.schoolName);
      if (schoolFilter !== "all" && matchedSchool?.id !== schoolFilter) {
        return false;
      }
      if (!normalizedKeyword) {
        return true;
      }

      return [item.schoolName, item.className, item.content, item.teacherName, item.serviceDate]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedKeyword));
    });
  }, [items, keyword, schoolFilter, schools]);

  const pagination = useMemo(
    () => paginateItems(filteredItems, page, pageSize),
    [filteredItems, page]
  );

  async function loadData() {
    setLoading(true);
    try {
      const [homeworkItems, schoolItems, classItems] = await Promise.all([
        fetchDailyHomework(),
        fetchSchools({ status: "active" }),
        fetchClasses({ status: "active" }),
      ]);
      setItems(homeworkItems);
      setSchools(schoolItems);
      setClasses(classItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setItems([]);
      setSchools([]);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setForm({
      ...initialForm,
      schoolId: schools[0]?.id || "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(item: DailyHomeworkItem) {
    const school = schools.find((entry) => entry.name === item.schoolName);
    const classItem = classes.find(
      (entry) => entry.schoolName === item.schoolName && entry.name === item.className
    );

    setForm({
      classId: classItem?.id || "",
      content: item.content,
      id: item.id,
      remark: item.remark,
      schoolId: school?.id || "",
      serviceDate: item.serviceDate,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const school = schools.find((item) => item.id === form.schoolId);
    const classItem = classes.find((item) => item.id === form.classId);
    if (!school || !classItem || !form.serviceDate.trim()) {
      toast.error("学校、班级、日期不能为空");
      return;
    }

    setSaving(true);
    try {
      await saveDailyHomework({
        className: classItem.name,
        content: form.content.trim(),
        id: form.id || undefined,
        remark: form.remark.trim(),
        schoolName: school.name,
        serviceDate: form.serviceDate.trim(),
        teacherId: session.user?.id || "",
        teacherName: session.user?.displayName || "",
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

  return (
    <PageContent>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-lg">每日作业</CardTitle>
        <Button onClick={openCreateDialog}>新增作业</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.9fr]">
          <Input
            placeholder="搜索日期 / 学校 / 班级 / 教师"
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
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">加载中</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>学校</TableHead>
                  <TableHead>班级</TableHead>
                  <TableHead>作业内容</TableHead>
                  <TableHead>教师</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.serviceDate}</TableCell>
                    <TableCell>{item.schoolName || "-"}</TableCell>
                    <TableCell>{item.className || "-"}</TableCell>
                    <TableCell className="max-w-xl truncate">{item.content || "-"}</TableCell>
                    <TableCell>{item.teacherName || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" onClick={() => openEditDialog(item)}>
                        编辑
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "编辑每日作业" : "新增每日作业"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <Field label="学校">
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
            </Field>
            <Field label="班级">
              <Select
                value={form.classId}
                onValueChange={(value) => setForm((current) => ({ ...current, classId: value }))}
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
            </Field>
            <Field label="日期">
              <Input
                placeholder="2026-03-31"
                value={form.serviceDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, serviceDate: event.target.value }))
                }
              />
            </Field>
            <div />
            <Field className="md:col-span-2" label="作业内容">
              <Textarea
                value={form.content}
                onChange={(event) =>
                  setForm((current) => ({ ...current, content: event.target.value }))
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
