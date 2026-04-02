import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
import { CircleCheck, CircleDashed, Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from "@/components/data-table";
import { LongText } from "@/components/long-text";
import { PageContent } from "@/components/page-content";
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
import { useAdminSession } from "@/lib/auth/session";
import {
  deleteHomeworkRecord,
  fetchHomeworkRecords,
  fetchStudents,
  saveHomeworkRecord,
  type HomeworkRecordItem,
  type StudentItem,
} from "@/lib/server-data";

// ---------------------------------------------------------------------------
// Constants & types
// ---------------------------------------------------------------------------

type HomeworkRecordDialogType = "create" | "edit";

const statusOptions = [
  { label: "待处理", value: "pending", icon: Clock },
  { label: "已完成", value: "completed", icon: CircleCheck },
  { label: "完成一部分", value: "partial", icon: CircleDashed },
] as const;

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "待处理", variant: "secondary" },
  completed: { label: "已完成", variant: "default" },
  partial: { label: "完成一部分", variant: "outline" },
};

const initialForm = {
  id: "",
  remark: "",
  serviceDate: "",
  status: "pending",
  studentId: "",
  subjectSummary: "",
};

// ---------------------------------------------------------------------------
// Context – dialog state provider (shadcn-admin pattern)
// ---------------------------------------------------------------------------

type HomeworkRecordsContextValue = {
  open: HomeworkRecordDialogType | null;
  setOpen: (value: HomeworkRecordDialogType | null) => void;
  currentItem: HomeworkRecordItem | null;
  setCurrentItem: (item: HomeworkRecordItem | null) => void;
  canEdit: boolean;
  reloadData: () => void;
  students: StudentItem[];
};

const HomeworkRecordsContext = createContext<HomeworkRecordsContextValue | null>(null);

function useHomeworkRecords() {
  const ctx = useContext(HomeworkRecordsContext);
  if (!ctx) throw new Error("useHomeworkRecords must be used within HomeworkRecordsProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const columns: ColumnDef<HomeworkRecordItem>[] = [
  {
    accessorKey: "serviceDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="日期" />,
    cell: ({ row }) => <div>{row.getValue("serviceDate")}</div>,
  },
  {
    accessorKey: "studentName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="学生" />,
    cell: ({ row }) => <div className="font-medium">{row.getValue("studentName")}</div>,
  },
  {
    id: "schoolClass",
    header: ({ column }) => <DataTableColumnHeader column={column} title="学校 / 班级" />,
    cell: ({ row }) => {
      const text = [row.original.schoolName, row.original.className]
        .filter(Boolean)
        .join(" / ");
      return <div>{text || "-"}</div>;
    },
    enableSorting: false,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="完成情况" />,
    cell: ({ row }) => {
      const status = row.getValue<string>("status");
      const info = statusMap[status] ?? { label: status, variant: "outline" as const };
      return <Badge variant={info.variant}>{info.label}</Badge>;
    },
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "subjectSummary",
    header: ({ column }) => <DataTableColumnHeader column={column} title="作业摘要" />,
    cell: ({ row }) => (
      <LongText className="max-w-[200px]">{row.getValue("subjectSummary") || "-"}</LongText>
    ),
    enableSorting: false,
  },
  {
    id: "actions",
    cell: function ActionsCell({ row }) {
      const { reloadData, setOpen, setCurrentItem, canEdit } = useHomeworkRecords();
      if (!canEdit) return null;
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
              if (!window.confirm("确定删除这条作业记录？")) return;
              try {
                await deleteHomeworkRecord(row.original.id);
                toast.success("作业记录已删除");
                reloadData();
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

// ---------------------------------------------------------------------------
// Homework record form dialog
// ---------------------------------------------------------------------------

function HomeworkRecordFormDialog() {
  const { open, setOpen, currentItem, reloadData, students } = useHomeworkRecords();
  const session = useAdminSession();
  const isEdit = open === "edit";
  const isOpen = open === "create" || open === "edit";

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && currentItem) {
      setForm({
        id: currentItem.id,
        remark: currentItem.remark,
        serviceDate: currentItem.serviceDate,
        status: currentItem.status,
        studentId: currentItem.studentId,
        subjectSummary: currentItem.subjectSummary,
      });
    } else if (open === "create") {
      setForm({ ...initialForm, studentId: students[0]?.id || "" });
    }
  }, [open, currentItem, isEdit, students]);

  async function handleSave() {
    const student = students.find((item) => item.id === form.studentId);
    if (!student || !form.serviceDate.trim()) {
      toast.error("学生和日期不能为空");
      return;
    }

    setSaving(true);
    try {
      await saveHomeworkRecord({
        className: student.className,
        id: form.id || undefined,
        imageUrls: [],
        recordedBy: session.user?.displayName || "",
        recordedById: session.user?.id || "",
        remark: form.remark.trim(),
        schoolName: student.schoolName,
        serviceDate: form.serviceDate.trim(),
        status: form.status,
        studentId: student.id,
        studentName: student.name,
        subjectSummary: form.subjectSummary.trim(),
      });
      toast.success("已保存");
      setOpen(null);
      reloadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => setOpen(null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑作业记录" : "新增作业记录"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>学生</Label>
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
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hw-date">日期</Label>
            <Input
              id="hw-date"
              placeholder="2026-03-31"
              value={form.serviceDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, serviceDate: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>完成情况</Label>
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
                <SelectItem value="partial">完成一部分</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="hw-subject-summary">作业摘要</Label>
            <Textarea
              id="hw-subject-summary"
              value={form.subjectSummary}
              onChange={(event) =>
                setForm((current) => ({ ...current, subjectSummary: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="hw-remark">反馈</Label>
            <Textarea
              id="hw-remark"
              value={form.remark}
              onChange={(event) =>
                setForm((current) => ({ ...current, remark: event.target.value }))
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
// Page component
// ---------------------------------------------------------------------------

export default function HomeworkRecordsPage() {
  const session = useAdminSession();
  const [open, setOpen] = useDialogState<HomeworkRecordDialogType>();
  const [currentItem, setCurrentItem] = useState<HomeworkRecordItem | null>(null);

  const [items, setItems] = useState<HomeworkRecordItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const canEdit = !!session.user?.roles.some((role) => role === "admin" || role === "teacher");

  useEffect(() => {
    void loadData();
  }, [session.user?.phone]);

  async function loadData() {
    setLoading(true);
    try {
      const studentItems = await fetchStudents(
        session.user?.roles.includes("guardian")
          ? { guardianPhone: session.user?.phone || "" }
          : undefined,
      );
      const recordItems = await fetchHomeworkRecords();
      const visibleStudentIDs = new Set(studentItems.map((item) => item.id));

      setStudents(studentItems);
      setItems(
        canEdit
          ? recordItems
          : recordItems.filter((item) => visibleStudentIDs.has(item.studentId)),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setStudents([]);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

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
        row.original.studentName,
        row.original.schoolName,
        row.original.className,
        row.original.subjectSummary,
        row.original.remark,
        row.original.serviceDate,
      ]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(keyword));
    },
  });

  const contextValue = useMemo<HomeworkRecordsContextValue>(
    () => ({ open, setOpen, currentItem, setCurrentItem, canEdit, reloadData: loadData, students }),
    [open, setOpen, currentItem, canEdit, students],
  );

  return (
    <HomeworkRecordsContext.Provider value={contextValue}>
      <PageContent>
        {/* 标题 */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">作业记录</h2>
            <p className="text-muted-foreground">管理学生作业完成情况</p>
          </div>
          {canEdit && (
            <Button className="space-x-1" onClick={() => setOpen("create")}>
              <span>新增记录</span> <Plus size={18} />
            </Button>
          )}
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
                searchPlaceholder="搜索学生 / 学校 / 班级 / 摘要 / 反馈 / 日期…"
                filters={[
                  {
                    columnId: "status",
                    title: "完成情况",
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

        {/* 对话框 */}
        <HomeworkRecordFormDialog />
      </PageContent>
    </HomeworkRecordsContext.Provider>
  );
}
