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
import { CircleCheck, CircleX, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTableColumnHeader, DataTablePagination, DataTableToolbar } from "@/components/data-table";
import { AttachmentPreviewList } from "@/components/domain/attachment-preview";
import { FileUpload, createFileItemsFromUrls, type FileItem } from "@/components/domain/file-upload";
import { MealStatusBadge } from "@/components/domain/meal-status-badge";
import { PageContent } from "@/components/page-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LongText } from "@/components/long-text";
import useDialogState from "@/hooks/use-dialog-state";
import { useAdminSession } from "@/lib/auth/session";
import { deleteMealRecord, fetchMealRecords, fetchStudents, saveMealRecord, type MealRecordItem, type StudentItem } from "@/lib/server-data";
import MealRecordBoard from "./meal-record-board";

// ---------------------------------------------------------------------------
// 常量 & 类型
// ---------------------------------------------------------------------------

type MealRecordDialogType = "create" | "edit";

const statusOptions = [
  { label: "已用餐", value: "completed", icon: CircleCheck },
  { label: "未用餐", value: "absent", icon: CircleX },
] as const;

const statusMap: Record<string, { label: string }> = {
  pending: { label: "待处理" },
  completed: { label: "已用餐" },
  absent: { label: "未用餐" },
};

const initialForm = {
  id: "",
  imageUrls: [] as FileItem[],
  remark: "",
  serviceDate: "",
  status: "completed",
  studentId: "",
};

function isActiveStudent(item: StudentItem) {
  return !item.status || item.status === "active";
}

// ---------------------------------------------------------------------------
// Context – 弹窗状态 & 共享数据（shadcn-admin 模式）
// ---------------------------------------------------------------------------

type MealRecordsContextValue = {
  open: MealRecordDialogType | null;
  setOpen: (value: MealRecordDialogType | null) => void;
  currentItem: MealRecordItem | null;
  setCurrentItem: (item: MealRecordItem | null) => void;
  canEdit: boolean;
  reloadData: () => void;
  students: StudentItem[];
  studentMap: Record<string, StudentItem>;
};

const MealRecordsContext = createContext<MealRecordsContextValue | null>(null);

function useMealRecords() {
  const ctx = useContext(MealRecordsContext);
  if (!ctx) throw new Error("useMealRecords must be used within MealRecordsProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// 列定义
// ---------------------------------------------------------------------------

const columns: ColumnDef<MealRecordItem>[] = [
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
    cell: function SchoolClassCell({ row }) {
      const { studentMap } = useMealRecords();
      const student = studentMap[row.original.studentId];
      const schoolClass = [student?.schoolName, student?.className].filter(Boolean).join(" / ") || "-";
      return <LongText className="text-sm">{schoolClass}</LongText>;
    },
    enableSorting: false,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
    cell: ({ row }) => {
      const status = row.getValue<string>("status");
      if (!statusMap[status]) {
        return <Badge variant="secondary">{status}</Badge>;
      }
      return <MealStatusBadge status={status as "absent" | "completed" | "pending"} />;
    },
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    id: "attachments",
    header: "附件",
    cell: ({ row }) => <AttachmentPreviewList compact items={createFileItemsFromUrls(row.original.imageUrls)} />,
    enableSorting: false,
  },
  {
    accessorKey: "remark",
    header: ({ column }) => <DataTableColumnHeader column={column} title="备注" />,
    cell: ({ row }) => <div>{row.getValue("remark") || "-"}</div>,
    enableSorting: false,
  },
  {
    id: "actions",
    cell: function ActionsCell({ row }) {
      const { reloadData, setOpen, setCurrentItem, canEdit } = useMealRecords();
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
              if (!window.confirm("确定删除这条用餐记录？")) return;
              try {
                await deleteMealRecord(row.original.id);
                toast.success("用餐记录已删除");
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
// 表单弹窗
// ---------------------------------------------------------------------------

function MealRecordFormDialog() {
  const { open, setOpen, currentItem, reloadData, students } = useMealRecords();
  const session = useAdminSession();
  const isEdit = open === "edit";
  const isOpen = open === "create" || open === "edit";

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const selectableStudents = useMemo(() => {
    const activeItems = students.filter(isActiveStudent);
    if (!form.studentId || activeItems.some((item) => item.id === form.studentId)) {
      return activeItems;
    }

    const currentStudent = students.find((item) => item.id === form.studentId);
    return currentStudent ? [...activeItems, currentStudent] : activeItems;
  }, [form.studentId, students]);

  useEffect(() => {
    if (isEdit && currentItem) {
      setForm({
        id: currentItem.id,
        imageUrls: createFileItemsFromUrls(currentItem.imageUrls),
        remark: currentItem.remark,
        serviceDate: currentItem.serviceDate,
        status: currentItem.status,
        studentId: currentItem.studentId,
      });
    } else if (open === "create") {
      setForm(initialForm);
    }
  }, [open, currentItem, isEdit]);

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
        imageUrls: form.imageUrls.map((item) => item.url),
        recordedBy: session.user?.displayName || "",
        recordedById: session.user?.id || "",
        remark: form.remark.trim(),
        serviceDate: form.serviceDate.trim(),
        status: form.status,
        studentId: student.id,
        studentName: student.name,
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑用餐记录" : "新增用餐记录"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="grid gap-2">
            <Label required>学生</Label>
            <Select value={form.studentId} onValueChange={(value) => setForm((current) => ({ ...current, studentId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="选择学生" />
              </SelectTrigger>
              <SelectContent>
                {selectableStudents.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="meal-service-date" required>
              日期
            </Label>
            <Input
              id="meal-service-date"
              placeholder="2026-03-31"
              value={form.serviceDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  serviceDate: event.target.value,
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>状态</Label>
            <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">已用餐</SelectItem>
                <SelectItem value="absent">未用餐</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label>附件（图片 / PDF）</Label>
            <FileUpload value={form.imageUrls} onChange={(value) => setForm((current) => ({ ...current, imageUrls: value }))} maxFiles={9} />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="meal-remark">备注</Label>
            <Textarea
              id="meal-remark"
              value={form.remark}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  remark: event.target.value,
                }))
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
// 页面组件
// ---------------------------------------------------------------------------

export default function MealRecordsPage() {
  return (
    <PageContent>
      <div className="mb-2">
        <h2 className="text-2xl font-bold tracking-tight">用餐记录</h2>
        <p className="text-muted-foreground">管理学生用餐登记信息</p>
      </div>

      <Tabs defaultValue="board" className="flex-1">
        <TabsList>
          <TabsTrigger value="board">面板视图</TabsTrigger>
          <TabsTrigger value="list">列表视图</TabsTrigger>
        </TabsList>
        <TabsContent value="board" className="mt-4">
          <MealRecordBoard />
        </TabsContent>
        <TabsContent value="list" className="mt-4">
          <MealRecordListView />
        </TabsContent>
      </Tabs>
    </PageContent>
  );
}

// ---------------------------------------------------------------------------
// 列表视图（原有逻辑）
// ---------------------------------------------------------------------------

function MealRecordListView() {
  const session = useAdminSession();
  const [open, setOpen] = useDialogState<MealRecordDialogType>();
  const [currentItem, setCurrentItem] = useState<MealRecordItem | null>(null);

  const [items, setItems] = useState<MealRecordItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const canEdit = !!session.user?.roles.some((role) => role === "admin" || role === "teacher");

  const studentMap = useMemo(() => {
    return students.reduce<Record<string, StudentItem>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [students]);

  useEffect(() => {
    void loadData();
  }, [session.user?.phone]);

  async function loadData() {
    setLoading(true);
    try {
      const studentItems = await fetchStudents(session.user?.roles.includes("guardian") ? { guardianPhone: session.user?.phone || "" } : undefined);
      const recordItems = await fetchMealRecords();
      const visibleStudentIDs = new Set(studentItems.map((item) => item.id));

      setStudents(studentItems);
      setItems(canEdit ? recordItems : recordItems.filter((item) => visibleStudentIDs.has(item.studentId)));
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
      const student = studentMap[row.original.studentId];
      return [row.original.studentName, row.original.serviceDate, row.original.remark, student?.schoolName, student?.className]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase().includes(keyword));
    },
  });

  const contextValue = useMemo<MealRecordsContextValue>(
    () => ({
      open,
      setOpen,
      currentItem,
      setCurrentItem,
      canEdit,
      reloadData: loadData,
      students,
      studentMap,
    }),
    [open, setOpen, currentItem, canEdit, students, studentMap],
  );

  return (
    <MealRecordsContext.Provider value={contextValue}>
      <div className="space-y-4">
        {/* 工具栏 */}
        <div className="flex items-center justify-end">
          {canEdit && (
            <Button className="space-x-1" onClick={() => setOpen("create")}>
              <span>新增记录</span> <Plus size={18} />
            </Button>
          )}
        </div>

        {/* 数据表格 */}
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">加载中…</div>
        ) : (
          <div className="space-y-4">
            <DataTableToolbar
              table={table}
              searchPlaceholder="搜索学生 / 日期 / 学校 / 班级…"
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
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                          <TableCell key={cell.id} className="bg-background group-hover/row:bg-muted">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
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

        {/* 弹窗 */}
        <MealRecordFormDialog />
      </div>
    </MealRecordsContext.Provider>
  );
}
