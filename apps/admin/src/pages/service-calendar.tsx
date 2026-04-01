import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CalendarPlus, Pencil } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  fetchServiceDays,
  saveServiceDay,
  type ServiceDayItem,
} from "@/lib/server-data";

// ---------------------------------------------------------------------------
// Constants & types
// ---------------------------------------------------------------------------

type ServiceCalendarDialogType = "create" | "edit";

const initialForm = {
  hasDaytimeHomeworkService: false,
  hasDinnerService: false,
  hasEveningHomeworkService: false,
  hasLunchService: false,
  id: "",
  remark: "",
  serviceDate: "",
  workHours: "",
};

// ---------------------------------------------------------------------------
// Context – dialog state provider (shadcn-admin pattern)
// ---------------------------------------------------------------------------

type ServiceCalendarContextValue = {
  open: ServiceCalendarDialogType | null;
  setOpen: (value: ServiceCalendarDialogType | null) => void;
  currentItem: ServiceDayItem | null;
  setCurrentItem: (item: ServiceDayItem | null) => void;
};

const ServiceCalendarContext =
  createContext<ServiceCalendarContextValue | null>(null);

function useServiceCalendar() {
  const ctx = useContext(ServiceCalendarContext);
  if (!ctx)
    throw new Error(
      "useServiceCalendar must be used within ServiceCalendarProvider",
    );
  return ctx;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const columns: ColumnDef<ServiceDayItem>[] = [
  {
    accessorKey: "serviceDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="日期" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("serviceDate")}</div>
    ),
  },
  {
    accessorKey: "hasLunchService",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="午餐" />
    ),
    cell: ({ row }) => {
      const val = row.getValue<boolean>("hasLunchService");
      return (
        <Badge variant={val ? "default" : "secondary"}>
          {val ? "开" : "关"}
        </Badge>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "hasDinnerService",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="晚餐" />
    ),
    cell: ({ row }) => {
      const val = row.getValue<boolean>("hasDinnerService");
      return (
        <Badge variant={val ? "default" : "secondary"}>
          {val ? "开" : "关"}
        </Badge>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "hasDaytimeHomeworkService",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="白天作业辅导" />
    ),
    cell: ({ row }) => {
      const val = row.getValue<boolean>("hasDaytimeHomeworkService");
      return (
        <Badge variant={val ? "default" : "secondary"}>
          {val ? "开" : "关"}
        </Badge>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "hasEveningHomeworkService",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="晚间作业辅导" />
    ),
    cell: ({ row }) => {
      const val = row.getValue<boolean>("hasEveningHomeworkService");
      return (
        <Badge variant={val ? "default" : "secondary"}>
          {val ? "开" : "关"}
        </Badge>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "workHours",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="工作时长" />
    ),
    cell: ({ row }) => row.getValue("workHours") || "-",
    enableSorting: false,
  },
  {
    id: "actions",
    cell: function ActionsCell({ row }) {
      const { setOpen, setCurrentItem } = useServiceCalendar();
      return (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0 data-[state=open]:bg-muted"
            >
              <DotsHorizontalIcon className="h-4 w-4" />
              <span className="sr-only">操作菜单</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                setCurrentItem(row.original);
                setOpen("edit");
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              编辑
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

// ---------------------------------------------------------------------------
// Service calendar form dialog
// ---------------------------------------------------------------------------

function ServiceCalendarFormDialog({ onSaved }: { onSaved: () => void }) {
  const { open, setOpen, currentItem } = useServiceCalendar();
  const isEdit = open === "edit";
  const isOpen = open === "create" || open === "edit";

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && currentItem) {
      setForm({
        hasDaytimeHomeworkService: currentItem.hasDaytimeHomeworkService,
        hasDinnerService: currentItem.hasDinnerService,
        hasEveningHomeworkService: currentItem.hasEveningHomeworkService,
        hasLunchService: currentItem.hasLunchService,
        id: currentItem.id,
        remark: currentItem.remark,
        serviceDate: currentItem.serviceDate,
        workHours: currentItem.workHours || "",
      });
    } else if (open === "create") {
      setForm(initialForm);
    }
  }, [open, currentItem, isEdit]);

  async function handleSave() {
    if (!form.serviceDate.trim()) {
      toast.error("日期不能为空");
      return;
    }

    setSaving(true);
    try {
      await saveServiceDay({
        hasDaytimeHomeworkService: form.hasDaytimeHomeworkService,
        hasDinnerService: form.hasDinnerService,
        hasEveningHomeworkService: form.hasEveningHomeworkService,
        hasHomeworkService:
          form.hasDaytimeHomeworkService || form.hasEveningHomeworkService,
        hasLunchService: form.hasLunchService,
        hasMealService: form.hasLunchService || form.hasDinnerService,
        id: form.id || undefined,
        remark: form.remark.trim(),
        serviceDate: form.serviceDate.trim(),
        workHours: form.workHours.trim(),
      });
      toast.success("已保存");
      setOpen(null);
      onSaved();
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
          <DialogTitle>
            {isEdit ? "编辑服务日历" : "新增服务日历"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <Field label="日期">
            <Input
              placeholder="2026-03-31"
              value={form.serviceDate}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  serviceDate: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="工作时长">
            <Input
              placeholder="09:00-20:30"
              value={form.workHours}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  workHours: event.target.value,
                }))
              }
            />
          </Field>
          <SwitchField
            checked={form.hasLunchService}
            label="午餐"
            onCheckedChange={(checked) =>
              setForm((current) => ({ ...current, hasLunchService: checked }))
            }
          />
          <SwitchField
            checked={form.hasDinnerService}
            label="晚餐"
            onCheckedChange={(checked) =>
              setForm((current) => ({ ...current, hasDinnerService: checked }))
            }
          />
          <SwitchField
            checked={form.hasDaytimeHomeworkService}
            label="白天作业辅导"
            onCheckedChange={(checked) =>
              setForm((current) => ({
                ...current,
                hasDaytimeHomeworkService: checked,
              }))
            }
          />
          <SwitchField
            checked={form.hasEveningHomeworkService}
            label="晚间作业辅导"
            onCheckedChange={(checked) =>
              setForm((current) => ({
                ...current,
                hasEveningHomeworkService: checked,
              }))
            }
          />
          <Field className="md:col-span-2" label="备注">
            <Textarea
              value={form.remark}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  remark: event.target.value,
                }))
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
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ServiceCalendarPage() {
  const [open, setOpen] = useDialogState<ServiceCalendarDialogType>();
  const [currentItem, setCurrentItem] = useState<ServiceDayItem | null>(null);

  const [items, setItems] = useState<ServiceDayItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      setItems(await fetchServiceDays());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const keyword = filterValue.toLowerCase();
      return [
        row.original.serviceDate,
        row.original.remark,
        row.original.workHours,
      ]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(keyword));
    },
  });

  const contextValue = useMemo<ServiceCalendarContextValue>(
    () => ({ open, setOpen, currentItem, setCurrentItem }),
    [open, setOpen, currentItem],
  );

  return (
    <ServiceCalendarContext.Provider value={contextValue}>
      <PageContent>
        {/* Title section */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">服务日历</h2>
            <p className="text-muted-foreground">管理服务日期与服务项目</p>
          </div>
          <Button className="space-x-1" onClick={() => setOpen("create")}>
            <span>新增日期</span> <CalendarPlus size={18} />
          </Button>
        </div>

        {/* Data table */}
        <div className="-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-x-12 lg:space-y-0">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              加载中…
            </div>
          ) : (
            <div className="space-y-4">
              <DataTableToolbar
                table={table}
                searchPlaceholder="搜索日期 / 备注 / 工作时长…"
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

        {/* Dialogs */}
        <ServiceCalendarFormDialog onSaved={loadData} />
      </PageContent>
    </ServiceCalendarContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Helper components
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

function SwitchField({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border px-4 py-3">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
