import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from "@/components/data-table";
import { LongText } from "@/components/long-text";
import { PageContent } from "@/components/page-content";
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
  fetchClasses,
  fetchDailyHomework,
  fetchSchools,
  saveDailyHomework,
  type ClassItem,
  type DailyHomeworkItem,
  type SchoolItem,
} from "@/lib/server-data";

// ---------------------------------------------------------------------------
// Constants & types
// ---------------------------------------------------------------------------

type DailyHomeworkDialogType = "create" | "edit";

const initialForm = {
  classId: "",
  content: "",
  id: "",
  remark: "",
  schoolId: "",
  serviceDate: "",
};

// ---------------------------------------------------------------------------
// Context – dialog state provider (shadcn-admin pattern)
// ---------------------------------------------------------------------------

type DailyHomeworkContextValue = {
  open: DailyHomeworkDialogType | null;
  setOpen: (value: DailyHomeworkDialogType | null) => void;
  currentItem: DailyHomeworkItem | null;
  setCurrentItem: (item: DailyHomeworkItem | null) => void;
  reloadData: () => void;
  schools: SchoolItem[];
  classes: ClassItem[];
};

const DailyHomeworkContext = createContext<DailyHomeworkContextValue | null>(null);

function useDailyHomework() {
  const ctx = useContext(DailyHomeworkContext);
  if (!ctx) throw new Error("useDailyHomework must be used within DailyHomeworkProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const columns: ColumnDef<DailyHomeworkItem>[] = [
  {
    accessorKey: "serviceDate",
    header: ({ column }) => <DataTableColumnHeader column={column} title="日期" />,
    cell: ({ row }) => <div>{row.getValue("serviceDate")}</div>,
  },
  {
    accessorKey: "schoolName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="学校" />,
    cell: ({ row }) => row.getValue("schoolName") || "-",
  },
  {
    accessorKey: "className",
    header: ({ column }) => <DataTableColumnHeader column={column} title="班级" />,
    cell: ({ row }) => row.getValue("className") || "-",
    enableSorting: false,
  },
  {
    accessorKey: "content",
    header: ({ column }) => <DataTableColumnHeader column={column} title="作业内容" />,
    cell: ({ row }) => (
      <LongText className="max-w-[300px]">{row.getValue("content") || "-"}</LongText>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "teacherName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="教师" />,
    cell: ({ row }) => row.getValue("teacherName") || "-",
    enableSorting: false,
  },
  {
    id: "actions",
    cell: function ActionsCell({ row }) {
      const { setOpen, setCurrentItem } = useDailyHomework();
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
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];

// ---------------------------------------------------------------------------
// Daily homework form dialog
// ---------------------------------------------------------------------------

function DailyHomeworkFormDialog() {
  const { open, setOpen, currentItem, reloadData, schools, classes } = useDailyHomework();
  const session = useAdminSession();
  const isEdit = open === "edit";
  const isOpen = open === "create" || open === "edit";

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const filteredClasses = useMemo(() => {
    if (!form.schoolId) return classes;
    return classes.filter((item) => item.schoolId === form.schoolId);
  }, [classes, form.schoolId]);

  useEffect(() => {
    if (isEdit && currentItem) {
      const school = schools.find((entry) => entry.name === currentItem.schoolName);
      const classItem = classes.find(
        (entry) => entry.schoolName === currentItem.schoolName && entry.name === currentItem.className,
      );
      setForm({
        classId: classItem?.id || "",
        content: currentItem.content,
        id: currentItem.id,
        remark: currentItem.remark,
        schoolId: school?.id || "",
        serviceDate: currentItem.serviceDate,
      });
    } else if (open === "create") {
      setForm({
        ...initialForm,
        schoolId: schools[0]?.id || "",
      });
    }
  }, [open, currentItem, isEdit, schools, classes]);

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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑每日作业" : "新增每日作业"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>学校</Label>
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
          </div>
          <div className="grid gap-2">
            <Label>班级</Label>
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
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hw-service-date">日期</Label>
            <Input
              id="hw-service-date"
              placeholder="2026-03-31"
              value={form.serviceDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, serviceDate: event.target.value }))
              }
            />
          </div>
          <div />
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="hw-content">作业内容</Label>
            <Textarea
              id="hw-content"
              value={form.content}
              onChange={(event) =>
                setForm((current) => ({ ...current, content: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="hw-remark">备注</Label>
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

export default function DailyHomeworkPage() {
  const [open, setOpen] = useDialogState<DailyHomeworkDialogType>();
  const [currentItem, setCurrentItem] = useState<DailyHomeworkItem | null>(null);

  const [items, setItems] = useState<DailyHomeworkItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  useEffect(() => {
    void loadData();
  }, []);

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
        row.original.schoolName,
        row.original.className,
        row.original.content,
        row.original.teacherName,
        row.original.serviceDate,
      ]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(keyword));
    },
  });

  const contextValue = useMemo<DailyHomeworkContextValue>(
    () => ({ open, setOpen, currentItem, setCurrentItem, reloadData: loadData, schools, classes }),
    [open, setOpen, currentItem, schools, classes],
  );

  return (
    <DailyHomeworkContext.Provider value={contextValue}>
      <PageContent>
        {/* Title section */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 space-y-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">每日作业</h2>
            <p className="text-muted-foreground">管理每日作业记录</p>
          </div>
          <Button className="space-x-1" onClick={() => setOpen("create")}>
            <span>新增作业</span> <Plus size={18} />
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
                searchPlaceholder="搜索学校 / 班级 / 内容 / 教师…"
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
        <DailyHomeworkFormDialog />
      </PageContent>
    </DailyHomeworkContext.Provider>
  );
}
