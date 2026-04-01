import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ListPagination } from "@/components/domain/list-pagination";
import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { useAdminSession } from "@/lib/auth/session";
import { paginateItems } from "@/lib/list-page";
import {
  fetchMealRecords,
  fetchStudents,
  saveMealRecord,
  type MealRecordItem,
  type StudentItem,
} from "@/lib/server-data";

const pageSize = 10;
const initialForm = {
  id: "",
  remark: "",
  serviceDate: "",
  status: "pending",
  studentId: "",
};

export default function MealRecordsPage() {
  const session = useAdminSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<MealRecordItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [students, setStudents] = useState<StudentItem[]>([]);

  const canEdit = session.user?.roles.some((role) => role === "admin" || role === "teacher");

  useEffect(() => {
    void loadData();
  }, [session.user?.phone]);

  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter]);

  const studentMap = useMemo(() => {
    return students.reduce<Record<string, StudentItem>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [students]);

  const filteredRecords = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return records.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      if (!normalizedKeyword) {
        return true;
      }

      const student = studentMap[item.studentId];
      return [
        item.studentName,
        item.serviceDate,
        item.remark,
        student?.schoolName,
        student?.className,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedKeyword));
    });
  }, [keyword, records, statusFilter, studentMap]);

  const pagination = useMemo(
    () => paginateItems(filteredRecords, page, pageSize),
    [filteredRecords, page]
  );

  async function loadData() {
    setLoading(true);
    try {
      const studentItems = await fetchStudents(
        session.user?.roles.includes("guardian")
          ? { guardianPhone: session.user?.phone || "" }
          : undefined
      );
      const recordItems = await fetchMealRecords();
      const visibleStudentIDs = new Set(studentItems.map((item) => item.id));

      setStudents(studentItems);
      setRecords(
        canEdit
          ? recordItems
          : recordItems.filter((item) => visibleStudentIDs.has(item.studentId))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setStudents([]);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  function openCreateDialog() {
    setForm({
      ...initialForm,
      studentId: students[0]?.id || "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(record: MealRecordItem) {
    setForm({
      id: record.id,
      remark: record.remark,
      serviceDate: record.serviceDate,
      status: record.status,
      studentId: record.studentId,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const student = students.find((item) => item.id === form.studentId);
    if (!student || !form.serviceDate.trim()) {
      toast.error("学生和日期不能为空");
      return;
    }

    setSaving(true);
    try {
      await saveMealRecord({
        id: form.id || undefined,
        imageUrls: [],
        recordedBy: session.user?.displayName || "",
        recordedById: session.user?.id || "",
        remark: form.remark.trim(),
        serviceDate: form.serviceDate.trim(),
        status: form.status,
        studentId: student.id,
        studentName: student.name,
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">用餐记录</h1>
          <p className="text-sm text-muted-foreground">共 {filteredRecords.length} 条</p>
        </div>
        {canEdit ? <Button onClick={openCreateDialog}>新增记录</Button> : null}
      </div>

      <Card>
        <CardHeader>
          <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr]">
            <Input
              placeholder="搜索日期 / 学生 / 学校 / 班级"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="leave">请假</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              加载中
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead>学生</TableHead>
                    <TableHead>学校 / 班级</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>备注</TableHead>
                    {canEdit ? <TableHead className="text-right">操作</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.items.map((record) => {
                    const student = studentMap[record.studentId];
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{record.serviceDate}</TableCell>
                        <TableCell className="font-medium">{record.studentName}</TableCell>
                        <TableCell>
                          {[student?.schoolName, student?.className].filter(Boolean).join(" / ") || "-"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={record.status} />
                        </TableCell>
                        <TableCell>{record.remark || "-"}</TableCell>
                        {canEdit ? (
                          <TableCell className="text-right">
                            <Button variant="outline" onClick={() => openEditDialog(record)}>
                              编辑
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {pagination.totalRows === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                  暂无数据
                </div>
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
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "编辑用餐记录" : "新增用餐记录"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <Field label="学生">
              <Select
                value={form.studentId}
                onValueChange={(value) => setForm((current) => ({ ...current, studentId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择学生" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
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
            <Field label="状态">
              <Select
                value={form.status}
                onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="leave">请假</SelectItem>
                </SelectContent>
              </Select>
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
    </div>
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
