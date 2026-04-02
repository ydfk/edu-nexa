import React, { useEffect, useMemo, useState } from "react";
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
import { KeyRound, Pencil, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { NameReminderAlert } from "@/components/domain/name-reminder-alert";
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from "@/components/data-table";
import { PageContent } from "@/components/page-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useDialogState from "@/hooks/use-dialog-state";
import { findSimilarNames, hasExactName } from "@/lib/name-check";
import {
  getDefaultLoginPassword,
  getDefaultLoginPasswordHint,
} from "@/lib/password-rules";
import {
  createUser,
  deleteUser,
  fetchUsers,
  resetUserPassword,
  updateUser,
  type UserItem,
} from "@/lib/server-data";
import { cn } from "@/lib/utils";

type DialogType = "add" | "edit" | "reset-password";

type TeachersContextType = {
  currentRow: UserItem | null;
  reloadData: () => void;
  setCurrentRow: React.Dispatch<React.SetStateAction<UserItem | null>>;
  setOpen: (value: DialogType | null) => void;
  users: UserItem[];
};

const roleLabelMap: Record<string, string> = {
  admin: "管理员",
  teacher: "教师",
  guardian: "家长",
};

const initialForm = {
  displayName: "",
  isAdmin: false,
  phone: "",
};

const TeachersContext = React.createContext<TeachersContextType | null>(null);

function useTeachers() {
  const ctx = React.useContext(TeachersContext);
  if (!ctx) {
    throw new Error("useTeachers must be used within TeachersProvider");
  }

  return ctx;
}

function RowActions({ row }: { row: { original: UserItem } }) {
  const { reloadData, setCurrentRow, setOpen } = useTeachers();

  return (
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setCurrentRow(row.original);
          setOpen("edit");
        }}
      >
        <Pencil className="mr-2 size-4" />
        编辑
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setCurrentRow(row.original);
          setOpen("reset-password");
        }}
      >
        <KeyRound className="mr-2 size-4" />
        重置密码
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={async () => {
          if (!window.confirm(`确定删除教师「${row.original.displayName || row.original.phone}」？`)) {
            return;
          }
          try {
            await deleteUser(row.original.id);
            toast.success("教师已删除");
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
}

const columns: ColumnDef<UserItem>[] = [
  {
    accessorKey: "displayName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="姓名" />,
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("displayName") || "-"}</span>
    ),
  },
  {
    accessorKey: "phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="手机号" />,
    cell: ({ row }) => <span>{row.getValue("phone")}</span>,
  },
  {
    accessorKey: "roles",
    header: "角色",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {(row.getValue("roles") as string[]).map((role) => (
          <Badge key={role} variant="outline">
            {roleLabelMap[role] || role}
          </Badge>
        ))}
      </div>
    ),
    enableSorting: false,
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActions row={row} />,
  },
];

function TeacherFormDialog({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { currentRow, reloadData, users } = useTeachers();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const isEdit = !!currentRow && open;
  const defaultPassword = useMemo(() => getDefaultLoginPassword(form.phone), [form.phone]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (currentRow) {
      setForm({
        displayName: currentRow.displayName || "",
        isAdmin: currentRow.roles.includes("admin"),
        phone: currentRow.phone,
      });
      return;
    }

    setForm(initialForm);
  }, [currentRow, open]);

  const nameItems = useMemo(
    () =>
      users.map((item) => ({
        id: item.id,
        name: item.displayName || item.phone,
      })),
    [users],
  );
  const exactDuplicate = hasExactName(nameItems, form.displayName, currentRow?.id);
  const similarItems = findSimilarNames(nameItems, form.displayName, currentRow?.id);

  async function handleSave() {
    if (!form.phone.trim()) {
      toast.error("手机号不能为空");
      return;
    }

    const payload = {
      displayName: form.displayName.trim(),
      phone: form.phone.trim(),
      roles: form.isAdmin ? ["teacher", "admin"] : ["teacher"],
    };

    setSaving(true);
    try {
      if (currentRow) {
        await updateUser(currentRow.id, payload);
      } else {
        await createUser({
          ...payload,
          password: defaultPassword,
        });
      }
      toast.success(currentRow ? "教师已更新" : "教师已创建");
      setForm(initialForm);
      onOpenChange(false);
      reloadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setForm(initialForm);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-start">
          <DialogTitle>{isEdit ? "编辑教师" : "新增教师"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "修改教师信息与管理员权限。" : "创建教师信息，并可选同步授予管理员权限。"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
            <Label className="text-end">姓名</Label>
            <Input
              className="col-span-3"
              value={form.displayName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
            />
          </div>
          <NameReminderAlert exact={exactDuplicate} label="教师" similarItems={similarItems} />
          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
            <Label className="text-end">手机号</Label>
            <Input
              className="col-span-3"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
            <Label className="text-end">默认密码</Label>
            <div className="col-span-3 space-y-1">
              <Input readOnly value={defaultPassword} />
              <p className="text-sm text-muted-foreground">
                {isEdit
                  ? "编辑教师不会修改现有密码，重置密码时会按这个规则生成。"
                  : getDefaultLoginPasswordHint(form.phone)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
            <Label className="text-end">管理员</Label>
            <div className="col-span-3 flex items-center gap-3">
              <Checkbox
                checked={form.isAdmin}
                onCheckedChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    isAdmin: checked === true,
                  }))
                }
              />
              <span className="text-sm text-muted-foreground">
                勾选后拥有与默认管理员一致的权限
              </span>
            </div>
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

function ResetPasswordDialog({
  currentRow,
  onOpenChange,
  open,
}: {
  currentRow: UserItem;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const defaultPassword = useMemo(
    () => getDefaultLoginPassword(currentRow.phone),
    [currentRow.phone],
  );

  async function handleReset() {
    setSaving(true);
    try {
      await resetUserPassword(currentRow.id, defaultPassword);
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
        <DialogHeader className="text-start">
          <DialogTitle>重置密码</DialogTitle>
          <DialogDescription>
            为 <span className="font-bold">{currentRow.displayName || currentRow.phone}</span> 重置密码。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
            <Label className="text-end">手机号</Label>
            <Input className="col-span-3" disabled value={currentRow.phone} />
          </div>
          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
            <Label className="text-end">新密码</Label>
            <div className="col-span-3 space-y-1">
              <Input readOnly value={defaultPassword} />
              <p className="text-sm text-muted-foreground">
                {getDefaultLoginPasswordHint(currentRow.phone)}
              </p>
            </div>
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

export default function TeachersPage() {
  const [open, setOpen] = useDialogState<DialogType>(null);
  const [currentRow, setCurrentRow] = useState<UserItem | null>(null);
  const [data, setData] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const users = await fetchUsers({ role: "teacher" });
      setData(users);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载失败");
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <TeachersContext.Provider
      value={{
        currentRow,
        reloadData: loadData,
        setCurrentRow,
        setOpen,
        users: data,
      }}
    >
      <PageContent>
        <div className="flex flex-1 flex-col gap-4 sm:gap-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">教师管理</h2>
              <p className="text-muted-foreground">管理教师及管理员权限</p>
            </div>
            <Button className="space-x-1" onClick={() => setOpen("add")}>
              <span>新增教师</span>
              <UserPlus size={18} />
            </Button>
          </div>

          <div className="flex flex-1 flex-col gap-4">
            <DataTableToolbar table={table} searchPlaceholder="搜索姓名 / 手机号..." />
            <div className="overflow-hidden rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="group/row">
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          className={cn(
                            "bg-background group-hover/row:bg-muted",
                            header.column.columnDef.meta?.className,
                          )}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="group/row">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              "bg-background group-hover/row:bg-muted",
                              cell.column.columnDef.meta?.className,
                            )}
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
            <DataTablePagination table={table} className="mt-auto" />
          </div>
        </div>
      </PageContent>

      <TeacherFormDialog
        open={open === "add" || open === "edit"}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setOpen(null);
            if (currentRow) {
              setTimeout(() => setCurrentRow(null), 300);
            }
            return;
          }

          setOpen(currentRow ? "edit" : "add");
        }}
      />
      {currentRow ? (
        <ResetPasswordDialog
          currentRow={currentRow}
          open={open === "reset-password"}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen ? "reset-password" : null);
            if (!nextOpen) {
              setTimeout(() => setCurrentRow(null), 300);
            }
          }}
        />
      ) : null}
    </TeachersContext.Provider>
  );
}
