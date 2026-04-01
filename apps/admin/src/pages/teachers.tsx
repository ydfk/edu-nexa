import React, { useEffect, useState } from "react";
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
import { KeyRound, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { DataTableColumnHeader, DataTablePagination, DataTableToolbar } from "@/components/data-table";
import { PageContent } from "@/components/page-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import useDialogState from "@/hooks/use-dialog-state";
import {
  createUser,
  fetchUsers,
  resetUserPassword,
  type UserItem,
} from "@/lib/server-data";

// ─── Context ────────────────────────────────────────────────────────────────
type DialogType = "add" | "reset-password";

type TeachersContextType = {
  open: DialogType | null;
  setOpen: (str: DialogType | null) => void;
  currentRow: UserItem | null;
  setCurrentRow: React.Dispatch<React.SetStateAction<UserItem | null>>;
  reloadData: () => void;
};

const TeachersContext = React.createContext<TeachersContextType | null>(null);

function useTeachers() {
  const ctx = React.useContext(TeachersContext);
  if (!ctx) throw new Error("useTeachers must be used within TeachersProvider");
  return ctx;
}

// ─── Columns ────────────────────────────────────────────────────────────────
function RowActions({ row }: { row: { original: UserItem } }) {
  const { setOpen, setCurrentRow } = useTeachers();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
          <DotsHorizontalIcon className="h-4 w-4" />
          <span className="sr-only">操作菜单</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(row.original);
            setOpen("reset-password");
          }}
        >
          重置密码
          <DropdownMenuShortcut>
            <KeyRound size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
          <Badge key={role} variant="outline" className="capitalize">
            {role}
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

// ─── Add Dialog ─────────────────────────────────────────────────────────────
const initialForm = { displayName: "", password: "123456", phone: "" };

function AddTeacherDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { reloadData } = useTeachers();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.phone || !form.password) {
      toast.error("手机号和默认密码不能为空");
      return;
    }
    setSaving(true);
    try {
      await createUser({
        displayName: form.displayName,
        password: form.password,
        phone: form.phone,
        roles: ["teacher"],
      });
      toast.success("教师账号已创建");
      setForm(initialForm);
      onOpenChange(false);
      reloadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        if (!state) setForm(initialForm);
        onOpenChange(state);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-start">
          <DialogTitle>新增教师</DialogTitle>
          <DialogDescription>创建新的教师账号，完成后点击保存。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
            <Label className="text-end">姓名</Label>
            <Input
              className="col-span-3"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
            <Label className="text-end">手机号</Label>
            <Input
              className="col-span-3"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
            <Label className="text-end">默认密码</Label>
            <Input
              className="col-span-3"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
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

// ─── Reset Password Dialog ──────────────────────────────────────────────────
function ResetPasswordDialog({
  open,
  onOpenChange,
  currentRow,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRow: UserItem;
}) {
  const [password, setPassword] = useState("123456");
  const [saving, setSaving] = useState(false);

  async function handleReset() {
    if (!password) {
      toast.error("密码不能为空");
      return;
    }
    setSaving(true);
    try {
      await resetUserPassword(currentRow.id, password);
      toast.success("密码已重置");
      setPassword("123456");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "重置失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        if (!state) setPassword("123456");
        onOpenChange(state);
      }}
    >
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
            <Input className="col-span-3" value={currentRow.phone} disabled />
          </div>
          <div className="grid grid-cols-4 items-center gap-x-4 gap-y-1">
            <Label className="text-end">新密码</Label>
            <Input
              className="col-span-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
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

// ─── Page ───────────────────────────────────────────────────────────────────
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
    state: { sorting, columnVisibility, globalFilter },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <TeachersContext
      value={{ open, setOpen, currentRow, setCurrentRow, reloadData: loadData }}
    >
      <PageContent>
        <div className="flex flex-1 flex-col gap-4 sm:gap-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">教师账号</h2>
              <p className="text-muted-foreground">管理教师账号及其权限</p>
            </div>
            <Button className="space-x-1" onClick={() => setOpen("add")}>
              <span>新增教师</span> <UserPlus size={18} />
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
                            header.column.columnDef.meta?.className
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
                  ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="group/row">
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              "bg-background group-hover/row:bg-muted",
                              cell.column.columnDef.meta?.className
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

      {/* Dialogs */}
      <AddTeacherDialog
        key="teacher-add"
        open={open === "add"}
        onOpenChange={() => setOpen("add")}
      />
      {currentRow && (
        <ResetPasswordDialog
          key={`teacher-reset-${currentRow.id}`}
          open={open === "reset-password"}
          onOpenChange={() => {
            setOpen("reset-password");
            setTimeout(() => setCurrentRow(null), 500);
          }}
          currentRow={currentRow}
        />
      )}
    </TeachersContext>
  );
}
