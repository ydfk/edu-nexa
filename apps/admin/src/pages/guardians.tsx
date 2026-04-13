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
import {
  AlertTriangle,
  CircleCheck,
  CirclePause,
  KeyRound,
  Trash2,
  UserPen,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { NameReminderAlert } from "@/components/domain/name-reminder-alert";
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from "@/components/data-table";
import { LongText } from "@/components/long-text";
import { PageContent } from "@/components/page-content";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { findSimilarNames, hasExactName } from "@/lib/name-check";
import {
  getDefaultLoginPassword,
  getDefaultLoginPasswordHint,
} from "@/lib/password-rules";
import {
  emptyRelationshipValue,
  parentRelationshipOptions,
} from "@/lib/parent-relationships";
import {
  deleteGuardianProfile,
  fetchGuardianProfiles,
  resetUserPassword,
  saveGuardianProfile,
  type GuardianProfileItem,
} from "@/lib/server-data";
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

type GuardianDialogType = "create" | "edit";
type DialogType = GuardianDialogType | "reset-password";

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
  password: "",
  phone: "",
  relationship: "",
  remark: "",
  status: "active",
};

type GuardiansContextValue = {
  currentItem: GuardianProfileItem | null;
  open: DialogType | null;
  reloadData: () => Promise<void>;
  setCurrentItem: (item: GuardianProfileItem | null) => void;
  setOpen: (value: DialogType | null) => void;
};

const GuardiansContext = createContext<GuardiansContextValue | null>(null);

function useGuardians() {
  const ctx = useContext(GuardiansContext);
  if (!ctx) {
    throw new Error("useGuardians must be used within GuardiansProvider");
  }

  return ctx;
}

const columns: ColumnDef<GuardianProfileItem>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="家长" />,
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="账号" />,
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
      const { reloadData, setCurrentItem, setOpen } = useGuardians();

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
            <UserPen className="mr-2 size-4" />
            编辑
          </Button>
          {row.original.userId ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCurrentItem(row.original);
                setOpen("reset-password");
              }}
            >
              <KeyRound className="mr-2 size-4" />
              重置密码
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            onClick={async () => {
              if (!window.confirm(`确定删除家长「${row.original.name}」？`)) return;
              try {
                await deleteGuardianProfile(row.original.id);
                toast.success("家长已删除");
                await reloadData();
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

function GuardianFormDialog({
  items,
  onSaved,
}: {
  items: GuardianProfileItem[];
  onSaved: () => void;
}) {
  const { currentItem, open, setOpen } = useGuardians();
  const isEdit = open === "edit";
  const isOpen = open === "create" || open === "edit";

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && currentItem) {
      setForm({
        id: currentItem.id,
        name: currentItem.name,
        password: getDefaultLoginPassword(currentItem.phone),
        phone: currentItem.phone,
        relationship: currentItem.relationship,
        remark: currentItem.remark,
        status: currentItem.status,
      });
    } else if (open === "create") {
      setForm(initialForm);
    }
  }, [open, currentItem, isEdit]);

  const exactDuplicate = hasExactName(items, form.name, form.id);
  const similarItems = findSimilarNames(items, form.name, form.id);
  const phoneExists = items.some(
    (item) => item.id !== form.id && item.phone.trim() === form.phone.trim(),
  );

  async function handleSave() {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("家长姓名和账号不能为空");
      return;
    }
    if (!isEdit && !form.password.trim()) {
      toast.error("密码不能为空");
      return;
    }
    if (phoneExists) {
      toast.error("家长账号已存在");
      return;
    }

    setSaving(true);
    try {
      await saveGuardianProfile({
        id: form.id || undefined,
        name: form.name.trim(),
        password: isEdit ? undefined : form.password.trim(),
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
          <DialogTitle>{isEdit ? "编辑家长" : "新增家长"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="guardian-name" required>姓名</Label>
            <Input
              id="guardian-name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>
          <NameReminderAlert exact={exactDuplicate} label="家长" similarItems={similarItems} />
          <div className="grid gap-2">
            <Label htmlFor="guardian-phone" required>账号</Label>
            <Input
              id="guardian-phone"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
          </div>
          {!isEdit ? (
            <div className="grid gap-2">
              <Label required>密码</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="请输入密码"
              />
            </div>
          ) : null}
          {phoneExists ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
                  <AlertTitle>账号已存在</AlertTitle>
                  <AlertDescription>当前账号已被其他家长使用。</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-2">
            <Label>关系</Label>
            <Select
              value={form.relationship || emptyRelationshipValue}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  relationship: value === emptyRelationshipValue ? "" : value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="可不填写" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={emptyRelationshipValue}>不填写</SelectItem>
                {parentRelationshipOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Button disabled={saving || phoneExists} onClick={handleSave}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  currentItem,
  onOpenChange,
  open,
}: {
  currentItem: GuardianProfileItem;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const defaultPassword = useMemo(
    () => getDefaultLoginPassword(currentItem.phone),
    [currentItem.phone],
  );
  const [password, setPassword] = useState(defaultPassword);

  useEffect(() => {
    if (!open) {
      return;
    }
    setPassword(defaultPassword);
  }, [defaultPassword, open]);

  async function handleReset() {
    if (!currentItem.userId) {
      toast.error("当前家长还没有登录账号");
      return;
    }
    if (!password.trim()) {
      toast.error("新密码不能为空");
      return;
    }

    setSaving(true);
    try {
      await resetUserPassword(currentItem.userId, password.trim());
      toast.success("密码已重置");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "重置失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>重置密码</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>家长</Label>
            <Input disabled value={currentItem.name || currentItem.phone} />
          </div>
          <div className="grid gap-2">
            <Label>账号</Label>
            <Input disabled value={currentItem.phone} />
          </div>
          <div className="grid gap-2">
            <Label>新密码</Label>
            <Input value={password} onChange={(event) => setPassword(event.target.value)} />
            <p className="text-sm text-muted-foreground">
              {getDefaultLoginPasswordHint(currentItem.phone)}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button disabled={saving} onClick={handleReset}>
            {saving ? "保存中..." : "确认"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function GuardiansPage() {
  const [open, setOpen] = useDialogState<DialogType>();
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
        .some((value) => value.toLowerCase().includes(keyword));
    },
  });

  const contextValue = useMemo<GuardiansContextValue>(
    () => ({ currentItem, open, reloadData: loadData, setCurrentItem, setOpen }),
    [currentItem, loadData, open, setOpen],
  );

  return (
    <GuardiansContext.Provider value={contextValue}>
      <PageContent>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">家长管理</h2>
            <p className="text-muted-foreground">管理学生家长信息</p>
          </div>
          <Button className="space-x-1" onClick={() => setOpen("create")}>
            <span>新增家长</span>
            <UserPlus size={18} />
          </Button>
        </div>

        <div className="-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-x-12 lg:space-y-0">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">加载中…</div>
          ) : (
            <div className="space-y-4">
              <DataTableToolbar
                table={table}
                searchPlaceholder="搜索姓名 / 账号 / 关系…"
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
                            <TableCell
                              key={cell.id}
                              className="bg-background group-hover/row:bg-muted"
                            >
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

        <GuardianFormDialog items={items} onSaved={loadData} />
        {currentItem ? (
          <ResetPasswordDialog
            currentItem={currentItem}
            open={open === "reset-password"}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen ? "reset-password" : null);
              if (!nextOpen) {
                setTimeout(() => setCurrentItem(null), 300);
              }
            }}
          />
        ) : null}
      </PageContent>
    </GuardiansContext.Provider>
  );
}
