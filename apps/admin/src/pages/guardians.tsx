import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DotsHorizontalIcon } from "@radix-ui/react-icons";
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
import { CircleCheck, CirclePause, UserPen, UserPlus } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  fetchGuardianProfiles,
  saveGuardianProfile,
  type GuardianProfileItem,
} from "@/lib/server-data";

// ---------------------------------------------------------------------------
// Constants & types
// ---------------------------------------------------------------------------

type GuardianDialogType = "create" | "edit";

const statusOptions = [
  { label: "启用", value: "active", icon: CircleCheck },
  { label: "暂停", value: "paused", icon: CirclePause },
] as const;

const statusMap: Record<string, { label: string; variant: "default" | "secondary" }> = {
  active: { label: "启用", variant: "default" },
  paused: { label: "暂停", variant: "secondary" },
};

const initialForm = {
  id: "",
  name: "",
  phone: "",
  relationship: "",
  remark: "",
  status: "active",
};

// ---------------------------------------------------------------------------
// Context – dialog state provider (shadcn-admin pattern)
// ---------------------------------------------------------------------------

type GuardiansContextValue = {
  open: GuardianDialogType | null;
  setOpen: (value: GuardianDialogType | null) => void;
  currentItem: GuardianProfileItem | null;
  setCurrentItem: (item: GuardianProfileItem | null) => void;
};

const GuardiansContext = createContext<GuardiansContextValue | null>(null);

function useGuardians() {
  const ctx = useContext(GuardiansContext);
  if (!ctx) throw new Error("useGuardians must be used within GuardiansProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const columns: ColumnDef<GuardianProfileItem>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="监护人" />,
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="手机号" />,
    cell: ({ row }) => <LongText className="max-w-[120px]">{row.getValue("phone")}</LongText>,
  },
  {
    accessorKey: "relationship",
    header: ({ column }) => <DataTableColumnHeader column={column} title="关系" />,
    cell: ({ row }) => row.getValue("relationship") || "-",
    enableSorting: false,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="状态" />,
    cell: ({ row }) => {
      const status = row.getValue<string>("status");
      const info = statusMap[status] ?? { label: status, variant: "outline" as const };
      return <Badge variant={info.variant}>{info.label}</Badge>;
    },
    filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "remark",
    header: ({ column }) => <DataTableColumnHeader column={column} title="备注" />,
    cell: ({ row }) => (
      <LongText className="max-w-[200px]">{row.getValue("remark") || "-"}</LongText>
    ),
    enableSorting: false,
  },
  {
    id: "actions",
    cell: function ActionsCell({ row }) {
      const { setOpen, setCurrentItem } = useGuardians();
      return (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 data-[state=open]:bg-muted">
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
              <UserPen className="mr-2 h-4 w-4" />
              编辑
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => navigator.clipboard.writeText(row.original.id)}
            >
              复制 ID
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
// Guardian form dialog
// ---------------------------------------------------------------------------

function GuardianFormDialog({
  onSaved,
}: {
  onSaved: () => void;
}) {
  const { open, setOpen, currentItem } = useGuardians();
  const isEdit = open === "edit";
  const isOpen = open === "create" || open === "edit";

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && currentItem) {
      setForm({
        id: currentItem.id,
        name: currentItem.name,
        phone: currentItem.phone,
        relationship: currentItem.relationship,
        remark: currentItem.remark,
        status: currentItem.status,
      });
    } else if (open === "create") {
      setForm(initialForm);
    }
  }, [open, currentItem, isEdit]);

  async function handleSave() {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("监护人姓名和手机号不能为空");
      return;
    }

    setSaving(true);
    try {
      await saveGuardianProfile({
        id: form.id || undefined,
        name: form.name.trim(),
        phone: form.phone.trim(),
        relationship: form.relationship.trim(),
        remark: form.remark.trim(),
        status: form.status,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑监护人" : "新增监护人"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="guardian-name">姓名</Label>
            <Input
              id="guardian-name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="guardian-phone">手机号</Label>
            <Input
              id="guardian-phone"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="guardian-relationship">关系</Label>
            <Input
              id="guardian-relationship"
              value={form.relationship}
              onChange={(event) =>
                setForm((current) => ({ ...current, relationship: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>状态</Label>
            <Select
              value={form.status}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, status: value }))
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
          <div className="grid gap-2">
            <Label htmlFor="guardian-remark">备注</Label>
            <Textarea
              id="guardian-remark"
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

export default function GuardiansPage() {
  const [open, setOpen] = useDialogState<GuardianDialogType>();
  const [currentItem, setCurrentItem] = useState<GuardianProfileItem | null>(null);

  const [items, setItems] = useState<GuardianProfileItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      setItems(await fetchGuardianProfiles());
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
      return [row.original.name, row.original.phone, row.original.relationship]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(keyword));
    },
  });

  const contextValue = useMemo<GuardiansContextValue>(
    () => ({ open, setOpen, currentItem, setCurrentItem }),
    [open, setOpen, currentItem],
  );

  return (
    <GuardiansContext.Provider value={contextValue}>
      <PageContent>
        {/* Title section */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">监护人</h2>
            <p className="text-muted-foreground">管理学生监护人信息</p>
          </div>
          <Button className="space-x-1" onClick={() => setOpen("create")}>
            <span>新增监护人</span> <UserPlus size={18} />
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
                searchPlaceholder="搜索姓名 / 手机号 / 关系…"
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

        {/* Dialogs */}
        <GuardianFormDialog onSaved={loadData} />
      </PageContent>
    </GuardiansContext.Provider>
  );
}
