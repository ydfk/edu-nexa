import { useCallback, useEffect, useMemo, useState } from "react";
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
import { CircleCheck, CircleDollarSign, Coins, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from "@/components/data-table";
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
import {
  fetchRuntimeSettings,
  parsePaymentTypes,
} from "@/lib/runtime-settings";
import {
  deletePaymentRecord,
  fetchPaymentRecords,
  fetchStudents,
  savePaymentRecord,
  type PaymentRecordItem,
  type StudentItem,
} from "@/lib/server-data";

type DialogType = "create" | "edit" | "refund";

const statusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  paid: { label: "已缴费", variant: "default" },
  partial_refunded: { label: "部分退费", variant: "secondary" },
  refunded: { label: "已退费", variant: "outline" },
};

const statusOptions = [
  { label: "已缴费", value: "paid", icon: CircleCheck },
  { label: "部分退费", value: "partial_refunded", icon: RotateCcw },
  { label: "已退费", value: "refunded", icon: Coins },
] as const;

const initialForm = {
  id: "",
  paidAt: "",
  paymentAmount: "",
  paymentType: "",
  periodEndDate: "",
  periodStartDate: "",
  refundAmount: "0",
  refundedAt: "",
  refundRemark: "",
  remark: "",
  studentId: "",
};

const initialRefundForm = {
  refundAmount: "0",
  refundedAt: "",
  refundRemark: "",
};

function isActiveStudent(item: StudentItem) {
  return !item.status || item.status === "active";
}

function formatRange(startDate: string, endDate: string) {
  if (!startDate && !endDate) return "-";
  return `${startDate || "--"} 至 ${endDate || "--"}`;
}

function createColumns(options: {
  onDelete: (item: PaymentRecordItem) => Promise<void>;
  onEdit: (item: PaymentRecordItem) => void;
  onRefund: (item: PaymentRecordItem) => void;
}): ColumnDef<PaymentRecordItem>[] {
  return [
    {
      accessorKey: "paidAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="缴费日期" />,
      cell: ({ row }) => row.getValue("paidAt") || "-",
    },
    {
      accessorKey: "studentName",
      header: ({ column }) => <DataTableColumnHeader column={column} title="学生" />,
      cell: ({ row }) => <div className="font-medium">{row.getValue("studentName")}</div>,
    },
    {
      id: "schoolInfo",
      header: "学校 / 年级 / 班级",
      cell: ({ row }) =>
        [row.original.schoolName, row.original.gradeName, row.original.className]
          .filter(Boolean)
          .join(" / ") || "-",
      enableSorting: false,
    },
    {
      id: "guardianInfo",
      header: "家长",
      cell: ({ row }) => (
        <div>
          <p>{row.original.guardianName || "-"}</p>
          <p className="text-sm text-muted-foreground">{row.original.guardianPhone || "-"}</p>
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "paymentType",
      header: ({ column }) => <DataTableColumnHeader column={column} title="缴费类型" />,
      cell: ({ row }) => row.getValue("paymentType") || "-",
    },
    {
      id: "paymentPeriod",
      header: "缴费周期",
      cell: ({ row }) => formatRange(row.original.periodStartDate, row.original.periodEndDate),
      enableSorting: false,
    },
    {
      accessorKey: "paymentAmount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="实收金额" />,
      cell: ({ row }) => `¥ ${row.original.paymentAmount.toFixed(2)}`,
    },
    {
      id: "refundInfo",
      header: "退费",
      cell: ({ row }) =>
        row.original.refundAmount > 0
          ? `¥ ${row.original.refundAmount.toFixed(2)} / ${row.original.refundedAt || "--"}`
          : "-",
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
      cell: ({ row }) => {
        const info = statusMap[row.original.status] ?? {
          label: row.original.status,
          variant: "secondary" as const,
        };
        return <Badge variant={info.variant}>{info.label}</Badge>;
      },
      filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => options.onEdit(row.original)}>
            <Pencil className="mr-2 size-4" />
            编辑
          </Button>
          <Button size="sm" variant="outline" onClick={() => options.onRefund(row.original)}>
            <RotateCcw className="mr-2 size-4" />
            退费
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={() => void options.onDelete(row.original)}
          >
            <Trash2 className="mr-2 size-4" />
            删除
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}

export default function PaymentsPage() {
  const [open, setOpen] = useDialogState<DialogType>();
  const [currentItem, setCurrentItem] = useState<PaymentRecordItem | null>(null);

  const [items, setItems] = useState<PaymentRecordItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(initialForm);
  const [refundForm, setRefundForm] = useState(initialRefundForm);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  useEffect(() => {
    if (open === "edit" && currentItem) {
      setForm({
        id: currentItem.id,
        paidAt: currentItem.paidAt,
        paymentAmount: String(currentItem.paymentAmount),
        paymentType: currentItem.paymentType,
        periodEndDate: currentItem.periodEndDate,
        periodStartDate: currentItem.periodStartDate,
        refundAmount: String(currentItem.refundAmount || 0),
        refundedAt: currentItem.refundedAt || "",
        refundRemark: currentItem.refundRemark || "",
        remark: currentItem.remark || "",
        studentId: currentItem.studentId,
      });
      return;
    }
    if (open === "create") {
      setForm(initialForm);
    }
  }, [open, currentItem]);

  useEffect(() => {
    if (open === "refund" && currentItem) {
      setRefundForm({
        refundAmount: String(currentItem.refundAmount || 0),
        refundedAt: currentItem.refundedAt || "",
        refundRemark: currentItem.refundRemark || "",
      });
    }
  }, [open, currentItem]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentItems, studentItems, runtimeSettings] = await Promise.all([
        fetchPaymentRecords(),
        fetchStudents(),
        fetchRuntimeSettings(),
      ]);
      setItems(paymentItems);
      setStudents(studentItems);
      setPaymentTypes(parsePaymentTypes(runtimeSettings));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setItems([]);
      setStudents([]);
      setPaymentTypes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedStudent = useMemo(
    () => students.find((item) => item.id === form.studentId) || null,
    [form.studentId, students],
  );
  const selectableStudents = useMemo(() => {
    const activeItems = students.filter(isActiveStudent);
    if (!form.studentId || activeItems.some((item) => item.id === form.studentId)) {
      return activeItems;
    }

    const currentStudent = students.find((item) => item.id === form.studentId);
    return currentStudent ? [...activeItems, currentStudent] : activeItems;
  }, [form.studentId, students]);

  async function handleSave() {
    if (!form.studentId || !form.paymentType.trim()) {
      toast.error("学生和缴费类型不能为空");
      return;
    }
    if (!form.paymentAmount.trim() || Number(form.paymentAmount) <= 0) {
      toast.error("缴费金额必须大于 0");
      return;
    }
    if (!form.paidAt.trim() || !form.periodStartDate.trim() || !form.periodEndDate.trim()) {
      toast.error("缴费日期和缴费周期不能为空");
      return;
    }

    setSaving(true);
    try {
      await savePaymentRecord({
        id: form.id || undefined,
        paidAt: form.paidAt.trim(),
        paymentAmount: Number(form.paymentAmount),
        paymentType: form.paymentType.trim(),
        periodEndDate: form.periodEndDate.trim(),
        periodStartDate: form.periodStartDate.trim(),
        refundAmount: Number(form.refundAmount || 0),
        refundedAt: form.refundedAt.trim(),
        refundRemark: form.refundRemark.trim(),
        remark: form.remark.trim(),
        studentId: form.studentId,
      });
      toast.success("已保存");
      setOpen(null);
      setCurrentItem(null);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRefund() {
    if (!currentItem) return;
    if (!refundForm.refundAmount.trim() || Number(refundForm.refundAmount) <= 0) {
      toast.error("退费金额必须大于 0");
      return;
    }
    if (!refundForm.refundedAt.trim()) {
      toast.error("退费日期不能为空");
      return;
    }

    setSaving(true);
    try {
      await savePaymentRecord({
        id: currentItem.id,
        paidAt: currentItem.paidAt,
        paymentAmount: currentItem.paymentAmount,
        paymentType: currentItem.paymentType,
        periodEndDate: currentItem.periodEndDate,
        periodStartDate: currentItem.periodStartDate,
        refundAmount: Number(refundForm.refundAmount),
        refundedAt: refundForm.refundedAt.trim(),
        refundRemark: refundForm.refundRemark.trim(),
        remark: currentItem.remark || "",
        studentId: currentItem.studentId,
      });
      toast.success("退费信息已保存");
      setOpen(null);
      setCurrentItem(null);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  const handleDelete = useCallback(async (item: PaymentRecordItem) => {
    if (!window.confirm(`确定删除缴费记录「${item.studentName} / ${item.paymentType}」？`)) {
      return;
    }
    try {
      await deletePaymentRecord(item.id);
      toast.success("缴费记录已删除");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    }
  }, [loadData]);

  const columns = useMemo(
    () =>
      createColumns({
        onDelete: handleDelete,
        onEdit: (item) => {
          setCurrentItem(item);
          setOpen("edit");
        },
        onRefund: (item) => {
          setCurrentItem(item);
          setOpen("refund");
        },
      }),
    [handleDelete, setOpen],
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
        row.original.studentName,
        row.original.guardianName,
        row.original.guardianPhone,
        row.original.schoolName,
        row.original.gradeName,
        row.original.className,
        row.original.paymentType,
        row.original.paidAt,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword));
    },
  });

  return (
    <PageContent>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">缴费管理</h2>
          <p className="text-muted-foreground">管理学生缴费与退费记录</p>
        </div>
        <Button
          className="space-x-1"
          onClick={() => {
            setCurrentItem(null);
            setOpen("create");
          }}
        >
          <span>新增缴费</span>
          <CircleDollarSign size={18} />
        </Button>
      </div>

      <div className="-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-x-12 lg:space-y-0">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">加载中…</div>
        ) : (
          <div className="space-y-4">
            <DataTableToolbar
              table={table}
              searchPlaceholder="搜索学生 / 家长 / 学校 / 类型 / 日期…"
              filters={[
                {
                  columnId: "status",
                  title: "状态",
                  options: statusOptions.map((item) => ({
                    label: item.label,
                    value: item.value,
                    icon: item.icon,
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
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? (
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
      </div>

      <Dialog open={open === "create" || open === "edit"} onOpenChange={() => setOpen(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{open === "edit" ? "编辑缴费" : "新增缴费"}</DialogTitle>
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
                  {selectableStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>缴费类型</Label>
              <Select
                value={form.paymentType}
                onValueChange={(value) => setForm((current) => ({ ...current, paymentType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择缴费类型" />
                </SelectTrigger>
                <SelectContent>
                  {paymentTypes.map((paymentType) => (
                    <SelectItem key={paymentType} value={paymentType}>
                      {paymentType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-amount">缴费金额</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0"
                step="0.01"
                value={form.paymentAmount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, paymentAmount: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-paid-at">缴费日期</Label>
              <Input
                id="payment-paid-at"
                type="date"
                value={form.paidAt}
                onChange={(event) => setForm((current) => ({ ...current, paidAt: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-period-start">周期开始</Label>
              <Input
                id="payment-period-start"
                type="date"
                value={form.periodStartDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, periodStartDate: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-period-end">周期结束</Label>
              <Input
                id="payment-period-end"
                type="date"
                value={form.periodEndDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, periodEndDate: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>学生信息</Label>
              <div className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-2">
                <div>学校：{selectedStudent?.schoolName || "-"}</div>
                <div>年级 / 班级：{[selectedStudent?.grade, selectedStudent?.className].filter(Boolean).join(" / ") || "-"}</div>
                <div>家长：{selectedStudent?.guardianName || "-"}</div>
                <div>家长手机号：{selectedStudent?.guardianPhone || "-"}</div>
              </div>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="payment-remark">备注</Label>
              <Textarea
                id="payment-remark"
                value={form.remark}
                onChange={(event) => setForm((current) => ({ ...current, remark: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={saving} onClick={() => void handleSave()}>
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "refund"} onOpenChange={() => setOpen(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>退费处理</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2 rounded-md border p-3 text-sm">
              <div>学生：{currentItem?.studentName || "-"}</div>
              <div>缴费类型：{currentItem?.paymentType || "-"}</div>
              <div>原缴费金额：¥ {currentItem?.paymentAmount.toFixed(2) || "0.00"}</div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="refund-amount">退费金额</Label>
              <Input
                id="refund-amount"
                type="number"
                min="0"
                step="0.01"
                value={refundForm.refundAmount}
                onChange={(event) =>
                  setRefundForm((current) => ({ ...current, refundAmount: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="refund-date">退费日期</Label>
              <Input
                id="refund-date"
                type="date"
                value={refundForm.refundedAt}
                onChange={(event) =>
                  setRefundForm((current) => ({ ...current, refundedAt: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="refund-remark">退费备注</Label>
              <Textarea
                id="refund-remark"
                value={refundForm.refundRemark}
                onChange={(event) =>
                  setRefundForm((current) => ({ ...current, refundRemark: event.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={saving} onClick={() => void handleSaveRefund()}>
              {saving ? "保存中..." : "保存退费"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
